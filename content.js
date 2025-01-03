// content.js
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

    /**
     * 도메인별 테두리 색상 반환
     */
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
            if (domain.endsWith("quizby.me")) return "#E9E7E1";
            return "black";
        } catch (e) {
            return "black";
        }
    }

    /**
     * 요소가 현재 뷰포트 내에 있는지 판별
     */
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    /**
     * 미리보기 컨테이너를 a 태그 바로 뒤에 삽입
     * @param {HTMLAnchorElement} linkElement 
     * @param {string} finalUrl 실제 미리보기 처리에 사용될 최종 URL
     */
    function insertPreviewContainer(linkElement, finalUrl) {
        // 이미 처리했으면 중복 삽입 X
        if (!finalUrl || processedLinks.has(finalUrl)) return;

        processedLinks.add(finalUrl);

        // 컨테이너 생성
        const container = document.createElement('div');
        container.style.width = "100%";
        container.style.minHeight = "0px";
        container.setAttribute('data-url', finalUrl);

        // a 태그 바로 뒤에 삽입
        linkElement.insertAdjacentElement('afterend', container);
    }

    /**
     * URL 변환 로직
     */
    async function transformUrlIfNeeded(originalUrl) {
        // 이미 embed 형태인지 먼저 확인
        let alreadyEmbed = originalUrl.match(/https?:\/\/www\.youtube\.com\/embed\/([^?]+)/);
        if (alreadyEmbed) {
            // 이미 embed 형태라면 그대로 반환
            return { type: 'iframe', url: originalUrl };
        }

        return new Promise((resolve) => {
            const urlObj = new URL(originalUrl);

            // ─────────────────────────────────────────
            // 1) 호스트가 정확히 ibb.co 인 경우만 체크
            // ─────────────────────────────────────────
            if (urlObj.hostname === "ibb.co") {
                // 예: https://ibb.co/xxxxx
                // pathname(예: "/xxxxx")에서 맨 앞 슬래시 제거
                const shortCode = urlObj.pathname.substring(1);
                // ibb.co 도메인은 getIbbImage -> 성공 시 이미지, 실패 시 iframe
                chrome.runtime.sendMessage({ action: 'getIbbImage', shortCode }, (response) => {
                    if (response && response.success) {
                        resolve({ type: 'img', url: response.imageUrl });
                    } else {
                        resolve({ type: 'iframe', url: originalUrl });
                    }
                });
                return;
            }

            // ─────────────────────────────────────────
            // 2) 나머지 i1bb.co, ib1b.co, ibb1.co, ibb.1co, ibb.c1o → 이전 정규식 매칭 그대로
            // ─────────────────────────────────────────
            let ibbMatch = originalUrl.match(/https?:\/\/(?:i1bb\.co|ib1b\.co|ibb1\.co|ibb\.1co|ibb\.c1o)\/([^/]+)$/);
            if (ibbMatch) {
                const shortCode = ibbMatch[1];
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

            // 3) postimg.cc
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

            // 4) bloupla.net
            let blouplaMatch = originalUrl.match(/https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
            if (blouplaMatch) {
                const randomString = blouplaMatch[1]; 
                resolve({
                    type: 'img',
                    url: `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${randomString}?alt=media`
                });
                return;
            }

            // 5) ifh.cc (및 변형 도메인)
            if (urlObj.hostname === "ifh.cc") {
                const path = urlObj.pathname;  
                if (path.startsWith("/v-")) {
                    const randomString = path.slice(3);
                    resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                    return;
                } else if (path.startsWith("/i-")) {
                    const randomString = path.slice(3);
                    resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                    return;
                } else {
                    // 그 외 경로는 그대로 사용
                    resolve({ type: 'img', url: originalUrl });
                    return;
                }
            }

            let ifh1Match = originalUrl.match(/https?:\/\/ifh1\.cc\/v-([^/?#]+)/);
            if (ifh1Match) {
                const randomString = ifh1Match[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let if1hMatch = originalUrl.match(/https?:\/\/if1h\.cc\/v-([^/?#]+)/);
            if (if1hMatch) {
                const randomString = if1hMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let i1fhMatch = originalUrl.match(/https?:\/\/i1fh\.cc\/v-([^/?#]+)/);
            if (i1fhMatch) {
                const randomString = i1fhMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ifhc1cMatch = originalUrl.match(/https?:\/\/ifh\.c1c\/v-([^/?#]+)/);
            if (ifhc1cMatch) {
                const randomString = ifhc1cMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ifh1ccMatch = originalUrl.match(/https?:\/\/ifh\.1cc\/v-([^/?#]+)/);
            if (ifh1ccMatch) {
                const randomString = ifh1ccMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            // ifh.cc 계열 (i-...) 
            if (urlObj.hostname === "ifh.cc") {
                const path = urlObj.pathname;  
                if (path.startsWith("/i-")) {
                    const randomString = path.slice(3); 
                    resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                    return;
                } else {
                    resolve({ type: 'img', url: originalUrl });
                    return;
                }
            }

            let iifh1Match = originalUrl.match(/https?:\/\/ifh1\.cc\/i-([^/?#]+)/);
            if (iifh1Match) {
                const randomString = iifh1Match[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iif1hMatch = originalUrl.match(/https?:\/\/if1h\.cc\/i-([^/?#]+)/);
            if (iif1hMatch) {
                const randomString = iif1hMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let ii1fhMatch = originalUrl.match(/https?:\/\/i1fh\.cc\/i-([^/?#]+)/);
            if (ii1fhMatch) {
                const randomString = ii1fhMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iifhc1cMatch = originalUrl.match(/https?:\/\/ifh\.c1c\/i-([^/?#]+)/);
            if (iifhc1cMatch) {
                const randomString = iifhc1cMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            let iifh1ccMatch = originalUrl.match(/https?:\/\/ifh\.1cc\/i-([^/?#]+)/);
            if (iifh1ccMatch) {
                const randomString = iifh1ccMatch[1]; 
                resolve({ type: 'img', url: `https://ifh.cc/g/${randomString}` });
                return;
            }

            // 6) 기타 이미지 도메인들
            let sdfMatch = originalUrl.match(/^https?:\/\/lemmy\.sdf\.org\/pictrs\/image\/(.+)/);
            if (sdfMatch) {
                const randomString = sdfMatch[1];
                resolve({ type: 'img', url: `https://lemmy.sdf.org/pictrs/image/${randomString}` });
                return;
            }

            let imgnewsMatch = originalUrl.match(/^https?:\/\/imgnews\.pstatic\.net\/image\/(.+)/);
            if (imgnewsMatch) {
                const randomString = imgnewsMatch[1];
                resolve({ type: 'img', url: `https://imgnews.pstatic.net/image/${randomString}` });
                return;
            }

            // 바보상자 onrender
            let baboboxMatch = originalUrl.match(/https?:\/\/baboboximg\.onrender\.com\/view\?file=(.+)$/);
            if (baboboxMatch) {
                const randomString = baboboxMatch[1]; 
                resolve({ type: 'img', url: `https://baboboximg.onrender.com/images/${randomString}` });
                return;
            }

            let bbbiMatch = originalUrl.match(/https?:\/\/bbbi\.onrender\.com\/v\?f=(.+)$/);
            if (bbbiMatch) {
                const randomString = bbbiMatch[1]; 
                resolve({ type: 'img', url: `https://bbbi.onrender.com/images/${randomString}` });
                return;
            }

            // playentry.org/uploads/ 이미지 처리
            if (urlObj.hostname === "playentry.org" && urlObj.pathname.includes("/uploads/")) {
                resolve({ type: 'img', url: originalUrl });
                return;
            }

            // space.playentry.org/world/ 처리
            let spaceMatch = originalUrl.match(/https?:\/\/space\.playentry\.org\/world\/([^/]+)\/([^/]+)$/);
            if (spaceMatch) {
                const firstPart = spaceMatch[1]; 
                resolve({ type: 'iframe', url: `https://space.playentry.org/world/${firstPart}` });
                return;
            }

            // 유튜브 watch
            let youtubeMatch = originalUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+)/);
            if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                return;
            }

            // YouTube Shorts
            let youtubeShortsMatch = originalUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/shorts\/([^/?]+)/);
            if (youtubeShortsMatch) {
                const videoId = youtubeShortsMatch[1];
                resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                return;
            }

            // 유튜브 단축링크
            let youtubeShortMatch = originalUrl.match(/https?:\/\/youtu\.be\/([^?]+)/);
            if (youtubeShortMatch) {
                const videoId = youtubeShortMatch[1];
                resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                return;
            }

            // streamable
            let streamableMatch = originalUrl.match(/https?:\/\/streamable\.com\/([^&]+)/);
            if (streamableMatch) {
                const videoId = streamableMatch[1]; 
                resolve({ type: 'iframe', url: `https://streamable.com/e/${videoId}` });
                return;
            }

            // 그 외 도메인은 iframe 처리
            resolve({ type: 'iframe', url: originalUrl });
        });
    }

    /**
     * 동영상 태그 생성
     */
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

    /**
     * 아이프레임 태그 생성
     */
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
        
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; encrypted-media');
        
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

    /**
     * 이미지 태그 생성
     */
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

    /**
     * 실제로 게시물 내부의 링크들을 순회하며 컨테이너를 삽입하고,
     * 컨테이너가 뷰포트에 들어오면 URL 변환/미리보기 태그를 생성
     */
    async function processPosts() {
        // 게시물(혹은 댓글 등) 요소들을 찾습니다.
        const posts = document.querySelectorAll(".css-6wq60h.e1i41bku1");
        posts.forEach(post => {
            if (!post.dataset.converted) {
                post.dataset.converted = "true";

                // 여기서 a 태그를 찾음
                const links = post.querySelectorAll("a[href]");
                links.forEach(link => {
                    // 방어 코드: link 혹은 href 없으면 패스
                    if (!link || !link.hasAttribute('href')) {
                        return;
                    }
                    const hrefValue = link.getAttribute('href');
                    if (!hrefValue) {
                        return; 
                    }

                    // /redirect?external=(도메인) 구조라면 (도메인) 부분만 추출
                    const redirectMatch = hrefValue.match(/^\/redirect\?external=(.+)$/);
                    let finalUrl = null;

                    if (redirectMatch) {
                        try {
                            finalUrl = decodeURIComponent(redirectMatch[1]);
                        } catch {
                            finalUrl = redirectMatch[1];
                        }
                    } else {
                        finalUrl = hrefValue;
                    }

                    // 최종 URL이 http:// 또는 https:// 로 시작하면 미리보기 컨테이너 생성
                    if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
                        insertPreviewContainer(link, finalUrl);
                    }
                });
            }
        });

        // 이제 미리보기 컨테이너들에 대해 실제 변환 로직 수행
        const containers = document.querySelectorAll('div[data-url]');
        for (const container of containers) {
            const originalUrl = container.getAttribute('data-url');
            const visible = isInViewport(container);

            // 이미 변환 완료라면 재시도 안 함
            if (container.dataset.previewDone === "true") {
                let element = container.querySelector('[data-preview-img],[data-preview-video],[data-preview-iframe]');
                if (element && visible) {
                    element.style.display = "block";
                }
                continue;
            }

            // 뷰포트 밖이면 처리 안 함
            if (!visible) {
                continue;
            }

            // URL 변환 실행
            const { type, url } = await transformUrlIfNeeded(originalUrl);

            // 변환된 url을 container에 다시 저장 -> 중복 변환 방지
            container.setAttribute('data-url', url);

            const existingElement = container.querySelector('[data-preview-img],[data-preview-video],[data-preview-iframe]');
            if (!existingElement) {
                // 새로 생성
                if (type === 'img') {
                    createImageElement(url, originalUrl, container);
                } else if (type === 'video') {
                    createVideoElement(url, originalUrl, container);
                } else {
                    createIframeElement(url, originalUrl, container);
                }
            } else {
                // 이미 존재할 경우
                existingElement.style.display = "block";
                container.dataset.previewDone = "true";
            }
        }
    }

    // 일정 간격으로 게시물 내부를 탐색하여 새로 추가된 a 태그 등을 업데이트
    setInterval(() => {
        processPosts();
    }, 500);
})();
