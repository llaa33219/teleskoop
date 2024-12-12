(function() {
    const processedLinks = new Set(); 
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    let websocketErrorOccurred = false;

    // 전역 에러 핸들러 등록 - 웹소켓 에러 감지
    window.addEventListener('error', function(event) {
        if (event.message && event.message.includes("WebSocket connection to 'wss://hw.playentry.org:23518/socket.io/")) {
            websocketErrorOccurred = true;
        }
    }, true);

    function getBorderColor(url) {
        try {
            const u = new URL(url);
            const domain = u.hostname;
            if (domain.endsWith("bloupla.net")) return "#0000DD";
            if (domain.endsWith("playentry.org")) return "#00DD00";
            if (domain.endsWith("firebasestorage.googleapis.com")) return "#DD0000";
            if (domain.endsWith("ifh.cc")) return "#DDDDDD";
            if (domain.endsWith("i.postimg.cc")) return "#7777EE";
            if (domain.endsWith("baboboximg.onrender.com")) return "#FFA500";
            if (domain.endsWith("youtube.com")) return "#FF0000";
            if (domain.endsWith("youtu.be")) return "#FF0000";
            if (domain.endsWith("m.youtube.com")) return "#FF0000";
            if (domain.endsWith("naver.me")) return "#00DD00";
            if (domain.endsWith("tree.joody.day")) return "#008800";
            return "black";
        } catch (e) {
            return "black";
        }
    }

    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    function insertPreviewContainer(linkElement) {
        const url = linkElement.href;
        if (!url || processedLinks.has(url)) return;

        processedLinks.add(url);

        const container = document.createElement('div');
        container.style.width = "100%";
        container.style.minHeight = "300px";
        container.setAttribute('data-url', url);

        linkElement.insertAdjacentElement('afterend', container);
    }

    function convertTextLinksToAnchor(element) {
        element.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (urlRegex.test(text)) {
                    const replacedHTML = text.replace(urlRegex, (match) => {
                        return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
                    });
                    const span = document.createElement('span');
                    span.innerHTML = replacedHTML;
                    node.replaceWith(span);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                convertTextLinksToAnchor(node);
            }
        });
    }

    function transformUrlIfNeeded(originalUrl) {
        // bloupla.net/img/?=... 패턴
        let match = originalUrl.match(/https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
        if (match) {
            const randomString = match[1]; 
            return {
                type: 'img',
                url: `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${randomString}?alt=media`
            };
        }
    
        // ifh.cc/v-(...) 패턴 변환: v-뒤에 오는 글자들을 g/ 뒤에 붙여서 이미지 URL로 변환
        let ifhMatch = originalUrl.match(/https?:\/\/ifh\.cc\/v-(.+)$/);
        if (ifhMatch) {
            const randomString = ifhMatch[1]; 
            return {
                type: 'img',
                url: `https://ifh.cc/g/${randomString}`
            };
        }

        // ifh.cc/v-(...) 패턴 변환: v-뒤에 오는 글자들을 g/ 뒤에 붙여서 이미지 URL로 변환
        let ifh1Match = originalUrl.match(/https?:\/\/ifh1\.cc\/v-(.+)$/);
        if (ifh1Match) {
            const randomString = ifh1Match[1]; 
            return {
                type: 'img',
                url: `https://ifh.cc/g/${randomString}`
            };
        }

        // ifh.cc/v-(...) 패턴 변환: v-뒤에 오는 글자들을 g/ 뒤에 붙여서 이미지 URL로 변환
        let if1hMatch = originalUrl.match(/https?:\/\/if1h\.cc\/v-(.+)$/);
        if (if1hMatch) {
            const randomString = if1hMatch[1]; 
            return {
                type: 'img',
                url: `https://ifh.cc/g/${randomString}`
            };
        }

        // ifh.cc/v-(...) 패턴 변환: v-뒤에 오는 글자들을 g/ 뒤에 붙여서 이미지 URL로 변환
        let i1fhMatch = originalUrl.match(/https?:\/\/i1fh\.cc\/v-(.+)$/);
        if (i1fhMatch) {
            const randomString = i1fhMatch[1]; 
            return {
                type: 'img',
                url: `https://ifh.cc/g/${randomString}`
            };
        }

        // ifh.cc/v-(...) 패턴 변환: v-뒤에 오는 글자들을 g/ 뒤에 붙여서 이미지 URL로 변환
        let ifhc1cMatch = originalUrl.match(/https?:\/\/ifh\.c1c\/v-(.+)$/);
        if (ifhc1cMatch) {
            const randomString = ifhc1cMatch[1]; 
            return {
                type: 'img',
                url: `https://ifh.cc/g/${randomString}`
            };
        }

        // ifh.cc/v-(...) 패턴 변환: v-뒤에 오는 글자들을 g/ 뒤에 붙여서 이미지 URL로 변환
        let ifh1ccMatch = originalUrl.match(/https?:\/\/ifh\.1cc\/v-(.+)$/);
        if (ifh1ccMatch) {
            const randomString = ifh1ccMatch[1]; 
            return {
                type: 'img',
                url: `https://ifh.cc/g/${randomString}`
            };
        }

        // lemmy.sdf.org/pictrs/image
        let sdfMatch = originalUrl.match(/^https?:\/\/lemmy\.sdf\.org\/pictrs\/image\/(.+)/);
        if (sdfMatch) {
            const randomString = sdfMatch[1];
            return {
                type: 'img',
                url: `https://lemmy.sdf.org/pictrs/image/${randomString}`
            };
        }

        // baboboximg.onrender.com
        let baboboxMatch = originalUrl.match(/https?:\/\/baboboximg\.onrender\.com\/view\?file=(.+)$/);
        if (baboboxMatch) {
            const randomString = baboboxMatch[1]; 
            return {
                type: 'img',
                url: `https://baboboximg.onrender.com/images/${randomString}`
            };
        }

        const urlObj = new URL(originalUrl);

        // ifh.cc 도메인이고 다른 패턴일 경우에도 img로 처리
        if (urlObj.hostname === "ifh.cc") {
            return {
                type: 'img',
                url: originalUrl
            };
        }

        // i.postimg.cc 이미지 처리
        if (urlObj.hostname === "i.postimg.cc") {
            return {
                type: 'img',
                url: originalUrl
            };
        }

        // playentry.org/uploads/ 패턴 이미지 처리
        if (urlObj.hostname === "playentry.org" && urlObj.pathname.includes("/uploads/")) {
            return {
                type: 'img',
                url: originalUrl
            };
        }
    
        // 그 외에는 iframe
        return {
            type: 'iframe',
            url: originalUrl
        };
    }

    function createVideoElement(url, originalUrl, container) {
        const video = document.createElement('video');
        video.setAttribute('data-preview-video', 'true');
        video.src = url;
        video.style.width = "99%";
        video.style.height = "400px";
        video.style.border = `2px solid ${getBorderColor(originalUrl)}`;
        video.style.borderRadius = "8px";
        video.style.marginTop = "10px";
        video.style.backgroundColor = "#fff";
        video.controls = true; 
        container.appendChild(video);
        container.dataset.previewDone = "true"; // 미리보기 생성 완료
    }

    function createIframeElement(url, originalUrl, container) {
        const iframe = document.createElement("iframe");
        iframe.setAttribute('data-preview-iframe', 'true');
        iframe.src = url;
        iframe.style.width = "99%";
        iframe.style.height = "400px";
        iframe.style.border = `2px solid ${getBorderColor(originalUrl)}`;
        iframe.style.borderRadius = "8px";
        iframe.style.marginTop = "10px";
        iframe.style.backgroundColor = "#fff";

        iframe.addEventListener('error', () => {
            iframe.remove();
            const errorMsg = document.createElement('div');
            errorMsg.style.color = "red";
            errorMsg.style.padding = "5px";
            if (websocketErrorOccurred) {
                errorMsg.textContent = "웹소켓 에러남";
            } else {
                errorMsg.textContent = "미리보기를 로드할 수 없습니다. 사이트가 iframe을 허용하지 않거나 네트워크 문제가 있을 수 있습니다.";
            }
            container.appendChild(errorMsg);
            container.dataset.previewDone = "true"; // 실패했지만 재시도 방지
        });

        container.appendChild(iframe);
        container.dataset.previewDone = "true"; // 미리보기 생성 완료
    }

    function createImageElement(url, originalUrl, container) {
        const img = document.createElement('img');
        img.setAttribute('data-preview-img', 'true');
        img.src = url;
        img.style.width = "99%";
        img.style.height = "400px";
        img.style.border = `2px solid ${getBorderColor(originalUrl)}`;
        img.style.borderRadius = "8px";
        img.style.marginTop = "10px";
        img.style.backgroundColor = "#fff";
        img.style.objectFit = "contain";

        img.onload = () => {
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                // 이미지가 로드 되었지만 내용이 없으면 비디오로 전환
                img.remove();
                createVideoElement(url, originalUrl, container);
            } else {
                // 정상 로드
                container.dataset.previewDone = "true";
            }
        };

        img.onerror = () => {
            // 이미지 로드 실패 시 비디오로 전환
            img.remove();
            createVideoElement(url, originalUrl, container);
        };

        container.appendChild(img);
    }

    function processPosts() {
        const posts = document.querySelectorAll(".css-sy8ihv.e1i41bku1");
        posts.forEach(post => {
            if (!post.dataset.converted) {
                convertTextLinksToAnchor(post);
                post.dataset.converted = "true";

                const links = post.querySelectorAll("a[href]");
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
                        insertPreviewContainer(link);
                    }
                });
            }
        });

        const containers = document.querySelectorAll('div[data-url]');
        containers.forEach(container => {
            const originalUrl = container.getAttribute('data-url');
            const visible = isInViewport(container);

            // 만약 이미 미리보기가 완료되었다면(이미지/비디오/iframe 생성 완료),
            // 중복해서 생성하지 않고 단순히 보여주기만 함
            let element = container.querySelector('[data-preview-img],[data-preview-video],[data-preview-iframe]');

            if (!visible) {
                if (element) {
                    element.style.display = "none";
                }
                return;
            }

            if (container.dataset.previewDone === "true") {
                // 이미 미리보기 생성 완료 상태면 그냥 표시만
                if (element) element.style.display = "block";
                return;
            }

            // 아직 미리보기 생성 안된 경우 transformUrlIfNeeded 호출
            const {type, url} = transformUrlIfNeeded(originalUrl);

            if (!element) {
                // 타입에 따라 요소 생성
                if (type === 'img') {
                    createImageElement(url, originalUrl, container);
                } else if (type === 'video') {
                    createVideoElement(url, originalUrl, container);
                } else {
                    createIframeElement(url, originalUrl, container);
                }
            } else {
                // 이미 element 있는데 previewDone이 안된 경우는 거의 없으나,
                // 있다면 display block 처리
                element.style.display = "block";
            }
        });
    }

    setInterval(processPosts, 500);
})();
