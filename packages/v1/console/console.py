"""
Redis Console backend action.

A single dispatch endpoint that exposes the Redis data-structure surface to
the React frontend. The frontend selects a "section" (Strings, Hashes, ...) and
a concrete "op"; this module routes the request to the matching Redis call.

Design rules (from .openserverless-contract.md):
  * ctx.REDIS is the live redis client (decode_responses=True).
  * Every key is built from ctx.REDIS_PREFIX + an app-local suffix.
  * Return values are plain JSON-serializable objects; the generated wrapper
    nests them under {"body": ...}.
  * Adding a new Redis feature == adding one handler + one dispatch entry.
"""

import json


# ---------------------------------------------------------------------------
# Request helpers
# ---------------------------------------------------------------------------

def request_data(args):
    """Merge OpenWhisk body + top-level fields into one dict (top-level wins)."""
    data = dict(args) if isinstance(args, dict) else {}
    body = data.get("body")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {}
    merged = dict(body) if isinstance(body, dict) else {}
    ignored = {
        "body", "REDIS_URL", "REDIS_PREFIX",
        "__ow_method", "__ow_headers", "__ow_path", "__ow_body",
    }
    merged.update({k: v for k, v in data.items() if k not in ignored})
    return merged


def request_method(args):
    return (args.get("__ow_method") or args.get("method") or "GET").upper()


# ---------------------------------------------------------------------------
# Redis key helper
# ---------------------------------------------------------------------------

def rkey(ctx, name):
    """Build a prefix-safe Redis key from ctx.REDIS_PREFIX."""
    if name is None:
        name = ""
    name = str(name)
    prefix = getattr(ctx, "REDIS_PREFIX", "") or ""
    if name.startswith(prefix):
        return name
    return f"{prefix}{name}"


def strip_prefix(ctx, name):
    """Remove the app prefix so the UI shows clean key names."""
    if name is None:
        return ""
    name = str(name)
    prefix = getattr(ctx, "REDIS_PREFIX", "") or ""
    if prefix and name.startswith(prefix):
        return name[len(prefix):]
    return name


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return list(value)
    return [value]


# ---------------------------------------------------------------------------
# Connection / status
# ---------------------------------------------------------------------------

def cmd_status(ctx, data):
    r = ctx.REDIS
    ping = r.ping()
    info = r.info() if data.get("detail") else {}
    # server + client section only for a compact overview
    section = {}
    for key in ("redis_version", "redis_mode", "os", "arch_bits",
                "uptime_in_seconds", "connected_clients",
                "used_memory_human", "db0"):
        if key in info:
            section[key] = info[key]
    dbsize = r.dbsize()
    return {
        "ok": True,
        "connected": bool(ping),
        "dbsize": dbsize,
        "info": section,
        "prefix": getattr(ctx, "REDIS_PREFIX", "") or "",
    }


# ---------------------------------------------------------------------------
# Keys
# ---------------------------------------------------------------------------

def cmd_keys(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "scan").lower()

    if op == "scan":
        pattern = data.get("pattern") or "*"
        count = _to_int(data.get("count"), 200)
        cursor = _to_int(data.get("cursor"), 0)
        cur, keys = r.scan(cursor=cursor, match=pattern, count=count)
        return {
            "ok": True,
            "cursor": cur,
            "scan_complete": cur == 0,
            "keys": [strip_prefix(ctx, k) for k in keys],
            "count": len(keys),
        }

    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}

    if op == "type":
        t = r.type(rkey(ctx, key))
        return {"ok": True, "key": strip_prefix(ctx, key), "type": t}
    if op == "del":
        n = r.delete(rkey(ctx, key))
        return {"ok": True, "deleted": n}
    if op == "exists":
        n = r.exists(rkey(ctx, key))
        return {"ok": True, "exists": n}
    if op == "rename":
        newkey = data.get("newkey")
        if not newkey:
            return {"ok": False, "error": "Missing 'newkey'"}
        r.rename(rkey(ctx, key), rkey(ctx, newkey))
        return {"ok": True, "renamed_to": strip_prefix(ctx, newkey)}
    return {"ok": False, "error": f"Unknown keys op '{op}'"}


# ---------------------------------------------------------------------------
# Strings
# ---------------------------------------------------------------------------

def cmd_strings(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "get").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)

    if op == "set":
        value = data.get("value")
        if value is None:
            return {"ok": False, "error": "Missing 'value'"}
        ex = data.get("ex")
        nx = bool(data.get("nx"))
        xx = bool(data.get("xx"))
        kwargs = {}
        if ex is not None and ex != "":
            kwargs["ex"] = _to_int(ex)
        if nx:
            kwargs["nx"] = True
        if xx:
            kwargs["xx"] = True
        result = r.set(k, str(value), **kwargs)
        return {"ok": True, "set": result is not False, "key": strip_prefix(ctx, key)}
    if op == "get":
        return {"ok": True, "key": strip_prefix(ctx, key), "value": r.get(k)}
    if op == "getset":
        value = data.get("value")
        if value is None:
            return {"ok": False, "error": "Missing 'value'"}
        old = r.getset(k, str(value))
        return {"ok": True, "key": strip_prefix(ctx, key), "old_value": old}
    if op == "incr":
        return {"ok": True, "key": strip_prefix(ctx, key), "value": r.incr(k, _to_int(data.get("amount"), 1))}
    if op == "decr":
        return {"ok": True, "key": strip_prefix(ctx, key), "value": r.decr(k, _to_int(data.get("amount"), 1))}
    if op == "append":
        value = data.get("value")
        if value is None:
            return {"ok": False, "error": "Missing 'value'"}
        return {"ok": True, "key": strip_prefix(ctx, key), "length": r.append(k, str(value))}
    if op == "strlen":
        return {"ok": True, "key": strip_prefix(ctx, key), "length": r.strlen(k)}
    if op == "mget":
        keys = _as_list(data.get("keys"))
        if not keys:
            return {"ok": False, "error": "Missing 'keys'"}
        vals = r.mget([rkey(ctx, kk) for kk in keys])
        return {"ok": True, "values": dict(zip([strip_prefix(ctx, kk) for kk in keys], vals))}
    if op == "mset":
        mapping = data.get("mapping")
        if not isinstance(mapping, dict):
            return {"ok": False, "error": "Missing 'mapping' object"}
        prefixed = {rkey(ctx, kk): str(vv) for kk, vv in mapping.items()}
        r.mset(prefixed)
        return {"ok": True, "set": list(mapping.keys())}
    return {"ok": False, "error": f"Unknown strings op '{op}'"}


# ---------------------------------------------------------------------------
# Hashes
# ---------------------------------------------------------------------------

def cmd_hashes(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "hgetall").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)
    field = data.get("field")
    value = data.get("value")

    if op == "hset":
        if field is None:
            return {"ok": False, "error": "Missing 'field'"}
        if value is None:
            return {"ok": False, "error": "Missing 'value'"}
        n = r.hset(k, str(field), str(value))
        return {"ok": True, "added": n}
    if op == "hmset":
        mapping = data.get("mapping")
        if not isinstance(mapping, dict):
            return {"ok": False, "error": "Missing 'mapping' object"}
        n = r.hset(k, mapping={kk: str(vv) for kk, vv in mapping.items()})
        return {"ok": True, "added": n}
    if op == "hget":
        if field is None:
            return {"ok": False, "error": "Missing 'field'"}
        return {"ok": True, "key": strip_prefix(ctx, key), "field": field, "value": r.hget(k, str(field))}
    if op == "hgetall":
        raw = r.hgetall(k)
        return {"ok": True, "key": strip_prefix(ctx, key), "fields": raw, "count": len(raw)}
    if op == "hkeys":
        return {"ok": True, "key": strip_prefix(ctx, key), "fields": list(r.hkeys(k))}
    if op == "hvals":
        return {"ok": True, "key": strip_prefix(ctx, key), "values": list(r.hvals(k))}
    if op == "hlen":
        return {"ok": True, "key": strip_prefix(ctx, key), "length": r.hlen(k)}
    if op == "hdel":
        fields = _as_list(data.get("fields") or field)
        if not fields:
            return {"ok": False, "error": "Missing 'fields'"}
        n = r.hdel(k, *[str(f) for f in fields])
        return {"ok": True, "deleted": n}
    if op == "hexists":
        if field is None:
            return {"ok": False, "error": "Missing 'field'"}
        return {"ok": True, "exists": bool(r.hexists(k, str(field)))}
    return {"ok": False, "error": f"Unknown hashes op '{op}'"}


# ---------------------------------------------------------------------------
# Lists
# ---------------------------------------------------------------------------

def cmd_lists(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "lrange").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)
    value = data.get("value")
    values = _as_list(data.get("values") or value)

    if op == "lpush":
        if not values:
            return {"ok": False, "error": "Missing 'value(s)'"}
        n = r.lpush(k, *[str(v) for v in values])
        return {"ok": True, "length": n}
    if op == "rpush":
        if not values:
            return {"ok": False, "error": "Missing 'value(s)'"}
        n = r.rpush(k, *[str(v) for v in values])
        return {"ok": True, "length": n}
    if op == "lpop":
        count = _to_int(data.get("count"), 1)
        res = r.lpop(k, count) if data.get("count") else r.lpop(k)
        return {"ok": True, "value": res}
    if op == "rpop":
        res = r.rpop(k, _to_int(data.get("count"), 1)) if data.get("count") else r.rpop(k)
        return {"ok": True, "value": res}
    if op == "lrange":
        start = _to_int(data.get("start"), 0)
        stop = _to_int(data.get("stop"), -1)
        return {"ok": True, "key": strip_prefix(ctx, key), "items": r.lrange(k, start, stop)}
    if op == "llen":
        return {"ok": True, "key": strip_prefix(ctx, key), "length": r.llen(k)}
    if op == "lset":
        idx = _to_int(data.get("index"), 0)
        if value is None:
            return {"ok": False, "error": "Missing 'value'"}
        r.lset(k, idx, str(value))
        return {"ok": True, "index": idx}
    if op == "lrem":
        count = _to_int(data.get("count"), 0)
        if value is None:
            return {"ok": False, "error": "Missing 'value'"}
        n = r.lrem(k, count, str(value))
        return {"ok": True, "removed": n}
    return {"ok": False, "error": f"Unknown lists op '{op}'"}


# ---------------------------------------------------------------------------
# Sets
# ---------------------------------------------------------------------------

def cmd_sets(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "smembers").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)
    members = _as_list(data.get("members") or data.get("value"))

    if op == "sadd":
        if not members:
            return {"ok": False, "error": "Missing 'member(s)'"}
        n = r.sadd(k, *[str(m) for m in members])
        return {"ok": True, "added": n}
    if op == "srem":
        if not members:
            return {"ok": False, "error": "Missing 'member(s)'"}
        n = r.srem(k, *[str(m) for m in members])
        return {"ok": True, "removed": n}
    if op == "smembers":
        return {"ok": True, "key": strip_prefix(ctx, key), "members": sorted(r.smembers(k))}
    if op == "sismember":
        if not members:
            return {"ok": False, "error": "Missing 'member'"}
        return {"ok": True, "member": members[0], "is_member": bool(r.sismember(k, str(members[0])))}
    if op == "scard":
        return {"ok": True, "key": strip_prefix(ctx, key), "cardinality": r.scard(k)}
    return {"ok": False, "error": f"Unknown sets op '{op}'"}


# ---------------------------------------------------------------------------
# Sorted Sets
# ---------------------------------------------------------------------------

def cmd_sorted_sets(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "zrange").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)
    member = data.get("member")
    score = data.get("score")

    if op == "zadd":
        if member is None or score is None:
            return {"ok": False, "error": "Missing 'member' or 'score'"}
        n = r.zadd(k, {str(member): _to_float(score)})
        return {"ok": True, "added": n}
    if op == "zaddmany":
        mapping = data.get("mapping")
        if not isinstance(mapping, dict):
            return {"ok": False, "error": "Missing 'mapping' object"}
        n = r.zadd(k, {str(mm): _to_float(ss) for mm, ss in mapping.items()})
        return {"ok": True, "added": n}
    if op == "zrange":
        start = _to_int(data.get("start"), 0)
        stop = _to_int(data.get("stop"), -1)
        withscores = bool(data.get("withscores"))
        res = r.zrange(k, start, stop, withscores=withscores)
        if withscores:
            items = [{"member": m, "score": s} for m, s in res]
        else:
            items = list(res)
        return {"ok": True, "key": strip_prefix(ctx, key), "members": items}
    if op == "zrevrange":
        start = _to_int(data.get("start"), 0)
        stop = _to_int(data.get("stop"), -1)
        withscores = bool(data.get("withscores"))
        res = r.zrevrange(k, start, stop, withscores=withscores)
        if withscores:
            items = [{"member": m, "score": s} for m, s in res]
        else:
            items = list(res)
        return {"ok": True, "key": strip_prefix(ctx, key), "members": items}
    if op == "zrangebyscore":
        lo = data.get("min", "-inf")
        hi = data.get("max", "+inf")
        withscores = bool(data.get("withscores"))
        res = r.zrangebyscore(k, lo, hi, withscores=withscores)
        if withscores:
            items = [{"member": m, "score": s} for m, s in res]
        else:
            items = list(res)
        return {"ok": True, "key": strip_prefix(ctx, key), "members": items}
    if op == "zrem":
        if member is None:
            return {"ok": False, "error": "Missing 'member'"}
        n = r.zrem(k, str(member))
        return {"ok": True, "removed": n}
    if op == "zcard":
        return {"ok": True, "key": strip_prefix(ctx, key), "cardinality": r.zcard(k)}
    if op == "zscore":
        if member is None:
            return {"ok": False, "error": "Missing 'member'"}
        return {"ok": True, "member": member, "score": r.zscore(k, str(member))}
    return {"ok": False, "error": f"Unknown sorted-sets op '{op}'"}


# ---------------------------------------------------------------------------
# Streams
# ---------------------------------------------------------------------------

def cmd_streams(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "xrange").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)

    if op == "xadd":
        fields = data.get("fields")
        if not isinstance(fields, dict):
            return {"ok": False, "error": "Missing 'fields' object"}
        eid = data.get("id") or "*"
        mid = r.xadd(k, {str(kk): str(vv) for kk, vv in fields.items()}, id=eid)
        return {"ok": True, "id": mid}
    if op == "xrange":
        start = data.get("min") or "-"
        stop = data.get("max") or "+"
        count = _to_int(data.get("count"), 0) or None
        res = r.xrange(k, start, stop, count=count)
        return {"ok": True, "key": strip_prefix(ctx, key),
                "entries": [{"id": eid, "fields": f} for eid, f in res]}
    if op == "xlen":
        return {"ok": True, "key": strip_prefix(ctx, key), "length": r.xlen(k)}
    if op == "xdel":
        ids = _as_list(data.get("ids") or data.get("id"))
        if not ids:
            return {"ok": False, "error": "Missing 'id(s)'"}
        n = r.xdel(k, *[str(i) for i in ids])
        return {"ok": True, "deleted": n}
    return {"ok": False, "error": f"Unknown streams op '{op}'"}


# ---------------------------------------------------------------------------
# Pub/Sub
#
# Serverless actions are stateless short-lived requests, so a long-lived
# SUBSCRIBE socket is not possible. We expose PUBLISH and channel discovery,
# which fit the request/response model. The UI documents this limitation.
# ---------------------------------------------------------------------------

def cmd_pubsub(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "channels").lower()

    if op == "publish":
        channel = data.get("channel")
        message = data.get("message")
        if not channel or message is None:
            return {"ok": False, "error": "Missing 'channel' or 'message'"}
        # channel is not a key, but we namespace it for isolation
        ch = rkey(ctx, channel)
        n = r.publish(ch, str(message))
        return {"ok": True, "channel": strip_prefix(ctx, ch), "subscribers": n}
    if op == "channels":
        pattern = data.get("pattern") or f"{getattr(ctx, 'REDIS_PREFIX', '') or ''}*"
        channels = r.pubsub_channels(pattern)
        return {"ok": True, "channels": [strip_prefix(ctx, c) for c in channels]}
    if op == "numsub":
        channels = _as_list(data.get("channels"))
        if not channels:
            return {"ok": False, "error": "Missing 'channels'"}
        res = r.pubsub_numsub(*[rkey(ctx, c) for c in channels])
        # res is a flat list [chan, count, chan, count, ...]
        out = {}
        for i in range(0, len(res), 2):
            out[strip_prefix(ctx, res[i])] = res[i + 1]
        return {"ok": True, "subscribers": out}
    return {"ok": False, "error": f"Unknown pubsub op '{op}'"}


# ---------------------------------------------------------------------------
# TTL
# ---------------------------------------------------------------------------

def cmd_ttl(ctx, data):
    r = ctx.REDIS
    op = (data.get("op") or "ttl").lower()
    key = data.get("key")
    if not key:
        return {"ok": False, "error": "Missing 'key'"}
    k = rkey(ctx, key)

    if op == "ttl":
        return {"ok": True, "key": strip_prefix(ctx, key), "ttl": r.ttl(k)}
    if op == "pttl":
        return {"ok": True, "key": strip_prefix(ctx, key), "ttl_ms": r.pttl(k)}
    if op == "expire":
        seconds = _to_int(data.get("seconds"), 0)
        ok = r.expire(k, seconds)
        return {"ok": bool(ok), "key": strip_prefix(ctx, key), "set": bool(ok)}
    if op == "pexpire":
        ms = _to_int(data.get("milliseconds"), 0)
        ok = r.pexpire(k, ms)
        return {"ok": bool(ok), "key": strip_prefix(ctx, key), "set": bool(ok)}
    if op == "persist":
        ok = r.persist(k)
        return {"ok": bool(ok), "key": strip_prefix(ctx, key), "persisted": bool(ok)}
    return {"ok": False, "error": f"Unknown ttl op '{op}'"}


# ---------------------------------------------------------------------------
# Transactions (pipeline)
#
# Runs a list of [cmd, key, ...args] tuples atomically through a Redis
# pipeline/transaction. Each command's key argument is prefixed.
# ---------------------------------------------------------------------------

def cmd_transactions(ctx, data):
    r = ctx.REDIS
    commands = data.get("commands")
    if not isinstance(commands, list) or not commands:
        return {"ok": False, "error": "Missing 'commands' list"}

    use_multi = bool(data.get("multi", True))
    pipe = r.pipeline(transaction=use_multi)
    parsed = []
    for entry in commands:
        if not isinstance(entry, list) or not entry:
            return {"ok": False, "error": f"Invalid command entry: {entry!r}"}
        cmd_name = str(entry[0]).lower()
        args = list(entry[1:])
        # prefix the first key-like argument
        if args:
            args[0] = rkey(ctx, args[0])
        try:
            getattr(pipe, cmd_name)(*args)
            parsed.append(cmd_name)
        except AttributeError:
            return {"ok": False, "error": f"Unknown Redis command '{cmd_name}'"}
        except Exception as e:
            return {"ok": False, "error": f"Error queueing '{cmd_name}': {e}"}

    try:
        results = pipe.execute()
    except Exception as e:
        return {"ok": False, "error": f"Transaction failed: {e}"}

    out = []
    for name, res in zip(parsed, results):
        out.append({"cmd": name, "result": res})
    return {"ok": True, "executed": out}


# ---------------------------------------------------------------------------
# Raw commands
#
# Accepts a command line (string) or a structured list. The first key argument
# is prefixed with ctx.REDIS_PREFIX. Uses redis.execute_command.
# ---------------------------------------------------------------------------

_RAW_NO_KEY_COMMANDS = {
    "ping", "info", "dbsize", "flushdb", "config", "client",
    "time", "command", "pubsub",
}


def cmd_raw(ctx, data):
    r = ctx.REDIS
    raw = data.get("command")
    if not raw:
        return {"ok": False, "error": "Missing 'command'"}

    if isinstance(raw, str):
        parts = _split_command_line(raw)
    else:
        parts = [str(p) for p in raw]
    if not parts:
        return {"ok": False, "error": "Empty command"}

    cmd_name = parts[0].lower()
    args = parts[1:]

    # Prefix the key argument for commands that take a key, unless it is a
    # meta/no-key command.
    if cmd_name not in _RAW_NO_KEY_COMMANDS and args:
        args[0] = rkey(ctx, args[0])

    try:
        result = r.execute_command(cmd_name, *args)
    except Exception as e:
        return {"ok": False, "error": str(e), "command": cmd_name}

    return {"ok": True, "command": cmd_name, "args": args, "result": _jsonable(result)}


def _split_command_line(line):
    """Split a raw command line respecting single/double quotes."""
    import shlex
    try:
        return shlex.split(line)
    except ValueError:
        return line.split()


def _jsonable(value):
    """Best-effort conversion of redis-py responses to JSON-serializable."""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, set):
        return sorted(_jsonable(v) for v in value)
    return value


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

DISPATCH = {
    "status": cmd_status,
    "keys": cmd_keys,
    "strings": cmd_strings,
    "hashes": cmd_hashes,
    "lists": cmd_lists,
    "sets": cmd_sets,
    "sorted-sets": cmd_sorted_sets,
    "sortedsets": cmd_sorted_sets,
    "streams": cmd_streams,
    "pubsub": cmd_pubsub,
    "pub-sub": cmd_pubsub,
    "ttl": cmd_ttl,
    "transactions": cmd_transactions,
    "raw": cmd_raw,
}


def main(args, ctx=None):
    if not ctx or not hasattr(ctx, "REDIS") or ctx.REDIS is None:
        return {"ok": False, "error": "Redis not configured"}

    data = request_data(args)
    section = (data.get("cmd") or data.get("section") or "status").lower()

    handler = DISPATCH.get(section)
    if handler is None:
        return {"ok": False, "error": f"Unknown command '{section}'. Available: {sorted(set(DISPATCH))}"}

    try:
        return handler(ctx, data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"ok": False, "error": str(e)}