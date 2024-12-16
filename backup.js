// 현재 페이지가 목표하는 URL인지 판별
if (window.location.href.startsWith("https://playentry.org/community/entrystory/")) {
    // 바꾸고자 하는 새 문구 및 글자 크기 설정
    const newText = "엔트리 이야기🔭";
  
    function replaceTextAndStyle() {
      const headers = document.querySelectorAll("h2");
      let changed = false;
      headers.forEach((header) => {
        const text = header.textContent.trim();
        if (text === "엔트리 이야기") {
          header.textContent = newText;
          changed = true;
        }
      });
      return changed;
    }
  
    // 초기 시도
    let changed = replaceTextAndStyle();
  
    // 아직 변경되지 않았다면 DOM 변화 관찰
    if (!changed) {
      const observer = new MutationObserver(() => {
        if (replaceTextAndStyle()) {
          observer.disconnect(); // 목표 텍스트 발견 및 변경 후 관찰 중단
        }
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
  
  

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
            // 도메인별 색상 지정
            if (domain.endsWith("bloupla.net")) return "#0000DD";
            if (domain.endsWith("playentry.org")) return "#00DD00";
            if (domain.endsWith("firebasestorage.googleapis.com")) return "#DD0000";
            if (domain.endsWith("ifh.cc")) return "#DDDDDD";
            if (domain.endsWith("i1fh.cc")) return "#DDDDDD";
            if (domain.endsWith("if1h.cc")) return "#DDDDDD";
            if (domain.endsWith("ifh1.cc")) return "#DDDDDD";
            if (domain.endsWith("ifh.1cc")) return "#DDDDDD";
            if (domain.endsWith("ifh.c1c")) return "#DDDDDD";
            if (domain.endsWith("i.postimg.cc")) return "#7777EE";
            if (domain.endsWith("postimg.cc")) return "#7777EE";
            if (domain.endsWith("baboboximg.onrender.com")) return "#FFA500";
            if (domain.endsWith("youtube.com")) return "#FF0000";
            if (domain.endsWith("youtu.be")) return "#FF0000";
            if (domain.endsWith("m.youtube.com")) return "#FF0000";
            if (domain.endsWith("naver.me")) return "#00DD00";
            if (domain.endsWith("tree.joody.day")) return "#008800";
            if (domain.endsWith("colormytree.me")) return "#008800";
            if (domain.endsWith("ibb.co")) return "#50bcdf";
            if (domain.endsWith("i1bb.co")) return "#50bcdf";
            if (domain.endsWith("ib1b.co")) return "#50bcdf";
            if (domain.endsWith("ibb1.co")) return "#50bcdf";
            if (domain.endsWith("ibb.1co")) return "#50bcdf";
            if (domain.endsWith("ibb.c1o")) return "#50bcdf";
            if (domain.endsWith("snowman.quizby.me")) return "#D2E4F5";
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
        container.style.minHeight = "0px";
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
        return new Promise((resolve) => {
        // i1bb.co, ib1b.co, ibb1.co, ibb.1co, ibb.c1o, ibb.co 처리
        // 이 모든 도메인을 발견하면 ibb.co로 통일하여 처리
        let ibbMatch = originalUrl.match(/https?:\/\/(?:i1bb\.co|ib1b\.co|ibb1\.co|ibb\.1co|ibb\.c1o|ibb\.co)\/([^/]+)$/);
        if (ibbMatch) {
            const shortCode = ibbMatch[1];
            
            // 어떤 변형된 도메인이 들어와도 ibb.co로 변환
            let apiUrl = originalUrl.replace(/(i1bb\.co|ib1b\.co|ibb1\.co|ibb\.1co|ibb\.c1o)/, 'ibb.co');
            
            chrome.runtime.sendMessage({ action: 'getIbbImage', shortCode }, (response) => {
                if (response && response.success) {
                    resolve({ type: 'img', url: response.imageUrl });
                } else {
                    resolve({ type: 'iframe', url: apiUrl });
                }
            });
            return;
        }

            // postimg.cc 처리
            let postimgMatch = originalUrl.match(/https?:\/\/postimg\.cc\/([^/]+)$/);
            if (postimgMatch) {
                const shortCode = postimgMatch[1];
                chrome.runtime.sendMessage({ action: 'getPostimgImage', shortCode }, (response) => {
                    if (response && response.success) {
                        resolve({ type: 'img', url: response.imageUrl });
                    } else {
                        resolve({ type: 'iframe', url: originalUrl });
                    }
                });
                return;
            }

            // bloupla.net/img/?=... 패턴
            let blouplaMatch = originalUrl.match(/https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
            if (blouplaMatch) {
                const randomString = blouplaMatch[1]; 
                resolve({
                    type: 'img',
                    url: `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${randomString}?alt=media`
                });
                return;
            }

            // ifh.cc 계열 변환 (v-... -> g/...)
            let ifhMatch = originalUrl.match(/https?:\/\/ifh\.cc\/v-(.+)$/);
            if (ifhMatch) {
                const randomString = ifhMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ifh1Match = originalUrl.match(/https?:\/\/ifh1\.cc\/v-(.+)$/);
            if (ifh1Match) {
                const randomString = ifh1Match[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let if1hMatch = originalUrl.match(/https?:\/\/if1h\.cc\/v-(.+)$/);
            if (if1hMatch) {
                const randomString = if1hMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let i1fhMatch = originalUrl.match(/https?:\/\/i1fh\.cc\/v-(.+)$/);
            if (i1fhMatch) {
                const randomString = i1fhMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ifhc1cMatch = originalUrl.match(/https?:\/\/ifh\.c1c\/v-(.+)$/);
            if (ifhc1cMatch) {
                const randomString = ifhc1cMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ifh1ccMatch = originalUrl.match(/https?:\/\/ifh\.1cc\/v-(.+)$/);
            if (ifh1ccMatch) {
                const randomString = ifh1ccMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            // ifh.cc 계열 변환 (v-... -> g/...)
            let iifhMatch = originalUrl.match(/https?:\/\/ifh\.cc\/i-(.+)$/);
            if (iifhMatch) {
                const randomString = iifhMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iifh1Match = originalUrl.match(/https?:\/\/ifh1\.cc\/i-(.+)$/);
            if (iifh1Match) {
                const randomString = iifh1Match[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iif1hMatch = originalUrl.match(/https?:\/\/if1h\.cc\/i-(.+)$/);
            if (iif1hMatch) {
                const randomString = iif1hMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ii1fhMatch = originalUrl.match(/https?:\/\/i1fh\.cc\/i-(.+)$/);
            if (ii1fhMatch) {
                const randomString = ii1fhMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iifhc1cMatch = originalUrl.match(/https?:\/\/ifh\.c1c\/i-(.+)$/);
            if (iifhc1cMatch) {
                const randomString = iifhc1cMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iifh1ccMatch = originalUrl.match(/https?:\/\/ifh\.1cc\/i-(.+)$/);
            if (iifh1ccMatch) {
                const randomString = iifh1ccMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            // lemmy.sdf.org/pictrs/image/...
            let sdfMatch = originalUrl.match(/^https?:\/\/lemmy\.sdf\.org\/pictrs\/image\/(.+)/);
            if (sdfMatch) {
                const randomString = sdfMatch[1];
                resolve({ type: 'img', url: `https://lemmy.sdf.org/pictrs/image/${randomString}` });
                return;
            }

            // lemmy.sdf.org/pictrs/image/...
            let imgnewsMatch = originalUrl.match(/^https?:\/\/imgnews\.pstatic\.net\/image\/(.+)/);
            if (imgnewsMatch) {
                const randomString = imgnewsMatch[1];
                resolve({ type: 'img', url: `https://imgnews.pstatic.net/image/${randomString}` });
                return;
            }

            // baboboximg.onrender.com
            let baboboxMatch = originalUrl.match(/https?:\/\/baboboximg\.onrender\.com\/view\?file=(.+)$/);
            if (baboboxMatch) {
                const randomString = baboboxMatch[1]; 
                resolve({ type: 'img', url: `https://baboboximg.onrender.com/images/${randomString}` });
                return;
            }

            // i.postimg.cc 직접 이미지
            const urlObj = new URL(originalUrl);

            if (urlObj.hostname === "ifh.cc") {
                // ifh.cc 직접 이미지 링크
                resolve({ type: 'img', url: originalUrl });
                return;
            }

            if (urlObj.hostname === "i.postimg.cc") {
                // i.postimg.cc 직접 이미지
                resolve({ type: 'img', url: originalUrl });
                return;
            }

            if (urlObj.hostname === "i.ibb.co") {
                // i.ibb.co 직접 이미지
                resolve({ type: 'img', url: originalUrl });
                return;
            }

            // playentry.org/uploads/ 이미지 처리
            if (urlObj.hostname === "playentry.org" && urlObj.pathname.includes("/uploads/")) {
                resolve({ type: 'img', url: originalUrl });
                return;
            }

//           // playentry.org/signout
//           if (urlObj.hostname === "playentry.org" && urlObj.pathname.includes("/signout")) {
//               resolve({ type: 'iframe', url: `https://playentry.org` });
//               return;
//           }

            // space.playentry.org/world/(글자)/(글자) 형태 처리
            let spaceMatch = originalUrl.match(/https?:\/\/space\.playentry\.org\/world\/([^/]+)\/([^/]+)$/);
            if (spaceMatch) {
                const firstPart = spaceMatch[1]; 
                resolve({ type: 'iframe', url: `https://space.playentry.org/world/${firstPart}` });
                return;
            }

            // 유튜브 변환 부분
            let youtubeMatch = originalUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+)/);
            if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                // nocookie 도메인 사용
                resolve({ type: 'iframe', url: `https://www.youtube-nocookie.com/embed/${videoId}` });
                return;
            }

            let youtubeShortMatch = originalUrl.match(/https?:\/\/youtu\.be\/([^?]+)/);
            if (youtubeShortMatch) {
                const videoId = youtubeShortMatch[1];
                resolve({ type: 'iframe', url: `https://www.youtube-nocookie.com/embed/${videoId}` });
                return;
            }

            // 그 외 도메인은 iframe 처리
            resolve({ type: 'iframe', url: originalUrl });
        });
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
        container.dataset.previewDone = "true";
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
            container.dataset.previewDone = "true";
        });

        container.appendChild(iframe);
        container.dataset.previewDone = "true";
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
                // 이미지 형태로 로드되었으나 내용이 없으면 비디오로 전환
                img.remove();
                createVideoElement(url, originalUrl, container);
            } else {
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

    async function processPosts() {
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
        for (const container of containers) {
            const originalUrl = container.getAttribute('data-url');
            const visible = isInViewport(container);

            let element = container.querySelector('[data-preview-img],[data-preview-video],[data-preview-iframe]');

            if (!visible) {
                if (element) {
                    element.style.display = "none";
                }
                continue;
            }

            if (container.dataset.previewDone === "true") {
                if (element) element.style.display = "block";
                continue;
            }

            const { type, url } = await transformUrlIfNeeded(originalUrl);

            if (!element) {
                if (type === 'img') {
                    createImageElement(url, originalUrl, container);
                } else if (type === 'video') {
                    createVideoElement(url, originalUrl, container);
                } else {
                    createIframeElement(url, originalUrl, container);
                }
            } else {
                element.style.display = "block";
            }
        }
    }

    setInterval(() => {
        processPosts();
    }, 500);
})();
