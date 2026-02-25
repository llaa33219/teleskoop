'use strict';
(function() {
    function isPlayentryUrl(url) {
        try {
            if (typeof url !== 'string') url = String(url);
            var u = new URL(url, location.origin);
            return u.hostname === 'playentry.org' || u.hostname.endsWith('.playentry.org');
        } catch (e) {
            return false;
        }
    }

    function isSvgContent(contentType, url) {
        if (contentType && contentType.includes('svg')) return true;
        if (typeof url === 'string') {
            var path = url.split('?')[0].split('#')[0];
            if (path.toLowerCase().endsWith('.svg')) return true;
        }
        return false;
    }

    function sanitizeSvgText(text) {
        text = text.replace(/<[a-z]*:?script[\s>][\s\S]*?<\/[a-z]*:?script\s*>/gi, '');
        text = text.replace(/<[a-z]*:?script[^>]*\/\s*>/gi, '');
        text = text.replace(/<[a-z]*:?foreignObject[\s>][\s\S]*?<\/[a-z]*:?foreignObject\s*>/gi, '');
        text = text.replace(/<[a-z]*:?foreignObject[^>]*\/\s*>/gi, '');
        text = text.replace(/<[a-z]*:?handler[\s>][\s\S]*?<\/[a-z]*:?handler\s*>/gi, '');
        text = text.replace(/<[a-z]*:?handler[^>]*\/\s*>/gi, '');
        text = text.replace(/<[a-z]*:?listener[\s>][\s\S]*?<\/[a-z]*:?listener\s*>/gi, '');
        text = text.replace(/<[a-z]*:?listener[^>]*\/\s*>/gi, '');
        text = text.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
        text = text.replace(/(href\s*=\s*["'])\s*javascript:[^"']*(["'])/gi, '$1#$2');
        text = text.replace(/(xlink:href\s*=\s*["'])\s*javascript:[^"']*(["'])/gi, '$1#$2');
        text = text.replace(/(href\s*=\s*["'])\s*data\s*:\s*text\/html[^"']*(["'])/gi, '$1#$2');
        text = text.replace(/(xlink:href\s*=\s*["'])\s*data\s*:\s*text\/html[^"']*(["'])/gi, '$1#$2');
        text = text.replace(/(href\s*=\s*["'])\s*data\s*:\s*image\/svg\+xml[^"']*(["'])/gi, '$1#$2');
        text = text.replace(/(xlink:href\s*=\s*["'])\s*data\s*:\s*image\/svg\+xml[^"']*(["'])/gi, '$1#$2');
        text = text.replace(/<set\b[^>]*\battributeName\s*=\s*["'](?:href|xlink:href|on[a-z]+)["'][^>]*\/?>/gi, '');
        text = text.replace(/<animate\b[^>]*\battributeName\s*=\s*["'](?:href|xlink:href|on[a-z]+)["'][^>]*\/?>/gi, '');
        return text;
    }

    function stripControlChars(str) {
        return str.replace(/[\x00-\x20\x7f]/g, '');
    }

    function isDangerousUri(value) {
        var cleaned = stripControlChars(value).toLowerCase();
        if (cleaned.startsWith('javascript:')) return true;
        if (/^data\s*:\s*text\/html/i.test(cleaned)) return true;
        if (/^data\s*:\s*image\/svg\+xml/i.test(cleaned)) return true;
        return false;
    }

    function isSignoutUrl(url) {
        try {
            if (typeof url !== 'string') url = String(url);
            var decoded;
            try { decoded = decodeURIComponent(url); } catch(e) { decoded = url; }
            var pattern = /^https?:\/\/(?:www\.)?(?:ncc\.)?playentry\.org\/signout/i;
            if (pattern.test(url) || pattern.test(decoded)) return true;
            try {
                var u = new URL(url, location.origin);
                var decodedPath;
                try { decodedPath = decodeURIComponent(u.pathname); } catch(e) { decodedPath = u.pathname; }
                if ((u.hostname === 'playentry.org' || u.hostname === 'ncc.playentry.org' ||
                     u.hostname === 'www.playentry.org') && decodedPath.startsWith('/signout')) {
                    return true;
                }
            } catch(e) {}
            return false;
        } catch(e) {
            return false;
        }
    }

    function stripSignoutImgTags(html) {
        if (typeof html !== 'string') return html;
        if (html.indexOf('signout') === -1 && html.indexOf('%2Fsignout') === -1 && html.indexOf('%2fsignout') === -1) return html;
        return html.replace(/<img\b[^>]*\bsrc\s*=\s*["'][^"']*(?:(?:www\.)?(?:ncc\.)?playentry\.org)(?:\/|%2[Ff])signout[^"']*["'][^>]*\/?>/gi, '');
    }

    function sanitizeSvgElement(svgEl) {
        var dangerousTags = ['script', 'foreignObject', 'handler', 'listener'];
        dangerousTags.forEach(function(tag) {
            svgEl.querySelectorAll(tag).forEach(function(el) { el.remove(); });
        });

        var allEls = [svgEl].concat(Array.from(svgEl.querySelectorAll('*')));
        allEls.forEach(function(el) {
            var localName = (el.localName || el.nodeName || '').toLowerCase();
            if (localName === 'script' || localName.endsWith(':script') ||
                localName === 'foreignobject' || localName.endsWith(':foreignobject') ||
                localName === 'handler' || localName.endsWith(':handler') ||
                localName === 'listener' || localName.endsWith(':listener')) {
                el.remove();
                return;
            }

            var attrs = Array.from(el.attributes);
            for (var i = 0; i < attrs.length; i++) {
                var attr = attrs[i];
                if (attr.name.toLowerCase().startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
                if ((attr.name === 'href' || attr.name === 'xlink:href' || attr.name === 'src') &&
                    isDangerousUri(attr.value)) {
                    el.removeAttribute(attr.name);
                }
            }
        });

        svgEl.querySelectorAll('set, animate, animateTransform').forEach(function(el) {
            var attrName = (el.getAttribute('attributeName') || '').toLowerCase();
            if (['href', 'xlink:href', 'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'].indexOf(attrName) !== -1) {
                el.remove();
            }
        });
    }

    function watchSvgAttributes(svgEl) {
        var attrObserver = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                var target = mutation.target;
                var attrName = mutation.attributeName;
                if (attrName && attrName.toLowerCase().startsWith('on')) {
                    target.removeAttribute(attrName);
                }
                if ((attrName === 'href' || attrName === 'xlink:href' || attrName === 'src')) {
                    var val = target.getAttribute(attrName);
                    if (val && isDangerousUri(val)) {
                        target.removeAttribute(attrName);
                    }
                }
            }
        });
        attrObserver.observe(svgEl, { attributes: true, subtree: true });
    }

    // ========== 1) Fetch monkey-patch ==========
    var originalFetch = window.fetch;
    window.fetch = function(input, init) {
        return originalFetch.call(this, input, init).then(function(response) {
            try {
                var url = '';
                if (typeof input === 'string') url = input;
                else if (input instanceof Request) url = input.url;
                else if (input instanceof URL) url = input.href;

                var contentType = response.headers.get('content-type') || '';
                if (isPlayentryUrl(url) && isSvgContent(contentType, url)) {
                    return response.clone().text().then(function(text) {
                        var sanitized = sanitizeSvgText(text);
                        return new Response(sanitized, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers
                        });
                    });
                }
            } catch (e) {}
            return response;
        });
    };

    // ========== 2) XMLHttpRequest monkey-patch ==========
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;
    var xhrResponseTextDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    var xhrResponseDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');

    XMLHttpRequest.prototype.open = function(method, url) {
        this.__svgSan_url = (typeof url === 'string') ? url : String(url);
        this.__svgSan_cache = null;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        return originalSend.apply(this, arguments);
    };

    function xhrNeedsSanitize(xhr) {
        if (!xhr.__svgSan_url || xhr.readyState !== 4) return false;
        if (!isPlayentryUrl(xhr.__svgSan_url)) return false;
        var ct = xhr.getResponseHeader('content-type') || '';
        return isSvgContent(ct, xhr.__svgSan_url);
    }

    if (xhrResponseTextDesc && xhrResponseTextDesc.get) {
        Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
            configurable: true,
            enumerable: true,
            get: function() {
                var text = xhrResponseTextDesc.get.call(this);
                if (xhrNeedsSanitize(this) && typeof text === 'string') {
                    if (!this.__svgSan_cache) {
                        this.__svgSan_cache = sanitizeSvgText(text);
                    }
                    return this.__svgSan_cache;
                }
                return text;
            }
        });
    }

    if (xhrResponseDesc && xhrResponseDesc.get) {
        Object.defineProperty(XMLHttpRequest.prototype, 'response', {
            configurable: true,
            enumerable: true,
            get: function() {
                var resp = xhrResponseDesc.get.call(this);
                if (xhrNeedsSanitize(this) && typeof resp === 'string') {
                    if (!this.__svgSan_cache) {
                        this.__svgSan_cache = sanitizeSvgText(resp);
                    }
                    return this.__svgSan_cache;
                }
                return resp;
            }
        });
    }

    // ========== 3) MutationObserver ==========
    function handleAddedNode(node) {
        if (node.nodeType !== 1) return;

        var nodeName = node.nodeName.toLowerCase();
        if (nodeName === 'img') {
            var imgSrc = node.getAttribute('src');
            if (imgSrc && isSignoutUrl(imgSrc)) {
                node.removeAttribute('src');
                node.remove();
                return;
            }
        }
        if (node.querySelectorAll) {
            node.querySelectorAll('img[src]').forEach(function(img) {
                var src = img.getAttribute('src');
                if (src && isSignoutUrl(src)) {
                    img.removeAttribute('src');
                    img.remove();
                }
            });
        }

        if (node.nodeName.toLowerCase() === 'svg' || node instanceof SVGSVGElement) {
            sanitizeSvgElement(node);
            watchSvgAttributes(node);
            return;
        }

        if (node.querySelectorAll) {
            node.querySelectorAll('svg').forEach(function(svg) {
                sanitizeSvgElement(svg);
                watchSvgAttributes(svg);
            });
        }

        var tagName = node.nodeName.toLowerCase();
        if (tagName === 'object' || tagName === 'embed') {
            var src = node.getAttribute('data') || node.getAttribute('src') || '';
            if (isPlayentryUrl(src) && isSvgContent('', src)) {
                var img = document.createElement('img');
                img.src = src;
                img.style.cssText = node.style ? node.style.cssText : '';
                if (node.getAttribute('width')) img.setAttribute('width', node.getAttribute('width'));
                if (node.getAttribute('height')) img.setAttribute('height', node.getAttribute('height'));
                if (node.parentNode) node.parentNode.replaceChild(img, node);
            }
        }
    }

    function startObserver(root) {
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.type === 'childList') {
                    var addedNodes = mutation.addedNodes;
                    for (var j = 0; j < addedNodes.length; j++) {
                        handleAddedNode(addedNodes[j]);
                    }
                } else if (mutation.type === 'attributes') {
                    var target = mutation.target;
                    if (target.nodeName && target.nodeName.toLowerCase() === 'img') {
                        var src = target.getAttribute('src');
                        if (src && isSignoutUrl(src)) {
                            target.removeAttribute('src');
                            target.remove();
                        }
                    }
                }
            }
        });
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    }

    if (document.documentElement) {
        startObserver(document.documentElement);
    } else {
        var earlyObserver = new MutationObserver(function() {
            if (document.documentElement) {
                earlyObserver.disconnect();
                startObserver(document.documentElement);
            }
        });
        earlyObserver.observe(document, { childList: true, subtree: true });
    }

    // ========== 4) img signout blocking ==========
    var imgSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imgSrcDesc && imgSrcDesc.set) {
        var originalImgSrcGet = imgSrcDesc.get;
        var originalImgSrcSet = imgSrcDesc.set;
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            configurable: true,
            enumerable: true,
            get: originalImgSrcGet,
            set: function(value) {
                if (typeof value === 'string' && isSignoutUrl(value)) {
                    return;
                }
                originalImgSrcSet.call(this, value);
            }
        });
    }

    var originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        if (this instanceof HTMLImageElement &&
            typeof name === 'string' && name.toLowerCase() === 'src' &&
            typeof value === 'string' && isSignoutUrl(value)) {
            return;
        }
        return originalSetAttribute.call(this, name, value);
    };

    // ========== 5) innerHTML / insertAdjacentHTML / DOMParser patching ==========
    var innerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (innerHTMLDesc && innerHTMLDesc.set) {
        var originalInnerHTMLGet = innerHTMLDesc.get;
        var originalInnerHTMLSet = innerHTMLDesc.set;
        Object.defineProperty(Element.prototype, 'innerHTML', {
            configurable: true,
            enumerable: true,
            get: originalInnerHTMLGet,
            set: function(value) {
                if (typeof value === 'string') {
                    value = stripSignoutImgTags(value);
                    if (/<svg[\s>]/i.test(value)) {
                        value = sanitizeSvgText(value);
                    }
                }
                originalInnerHTMLSet.call(this, value);
                var self = this;
                self.querySelectorAll('svg').forEach(function(svg) {
                    sanitizeSvgElement(svg);
                    watchSvgAttributes(svg);
                });
            }
        });
    }

    var outerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
    if (outerHTMLDesc && outerHTMLDesc.set) {
        var originalOuterHTMLGet = outerHTMLDesc.get;
        var originalOuterHTMLSet = outerHTMLDesc.set;
        Object.defineProperty(Element.prototype, 'outerHTML', {
            configurable: true,
            enumerable: true,
            get: originalOuterHTMLGet,
            set: function(value) {
                if (typeof value === 'string') {
                    value = stripSignoutImgTags(value);
                    if (/<svg[\s>]/i.test(value)) {
                        value = sanitizeSvgText(value);
                    }
                }
                originalOuterHTMLSet.call(this, value);
            }
        });
    }

    var originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function(position, text) {
        if (typeof text === 'string') {
            text = stripSignoutImgTags(text);
            if (/<svg[\s>]/i.test(text)) {
                text = sanitizeSvgText(text);
            }
        }
        originalInsertAdjacentHTML.call(this, position, text);
        var parent = this.parentElement || this;
        parent.querySelectorAll('svg').forEach(function(svg) {
            sanitizeSvgElement(svg);
            watchSvgAttributes(svg);
        });
    };

    var originalParseFromString = DOMParser.prototype.parseFromString;
    DOMParser.prototype.parseFromString = function(str, type) {
        var doc = originalParseFromString.call(this, str, type);
        if (type && (type.includes('svg') || type.includes('xml'))) {
            doc.querySelectorAll('svg').forEach(sanitizeSvgElement);
            if (doc.documentElement && doc.documentElement.nodeName.toLowerCase() === 'svg') {
                sanitizeSvgElement(doc.documentElement);
            }
        }
        return doc;
    };
})();
