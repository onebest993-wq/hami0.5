import DOMPurify from 'isomorphic-dompurify';
var SANITIZE_CONFIG = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
};
function sanitizeString(value) {
    return DOMPurify.sanitize(value, SANITIZE_CONFIG);
}
export function sanitizePayload(payload) {
    if (typeof payload === 'string') {
        return sanitizeString(payload);
    }
    if (payload === null || payload === undefined) {
        return payload;
    }
    if (Array.isArray(payload)) {
        return payload.map(function (item) { return sanitizePayload(item); });
    }
    if (typeof payload === 'object') {
        var out = {};
        for (var _i = 0, _a = Object.entries(payload); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            out[key] = sanitizePayload(value);
        }
        return out;
    }
    return payload;
}
