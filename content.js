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
            if (domain.endsWith("firebasestorage.googleapis.com")) return "#0000DD"; // 원래는 #0000DD를 쓰는게 아니라 빨간색으로 해야하는데 다중 이미지 태두리 표기 문제로 인한 임시대처
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
     */
    function insertPreviewContainer(linkElement, finalUrl) {
        if (!finalUrl || processedLinks.has(finalUrl)) return;
        processedLinks.add(finalUrl);

        const container = document.createElement('div');
        container.style.width = "100%";
        container.style.minHeight = "0px";
        container.setAttribute('data-url', finalUrl);

        linkElement.insertAdjacentElement('afterend', container);
    }

    /**
     * URL 변환 로직
     */
    async function transformUrlIfNeeded(originalUrl) {
        // 이미 embed 형태(youtube)라면 그대로
        let alreadyEmbed = originalUrl.match(/https?:\/\/www\.youtube\.com\/embed\/([^?]+)/);
        if (alreadyEmbed) {
            return { type: 'iframe', url: originalUrl };
        }
    
        // === [추가/수정] 여기서부터 백그라운드에 단축 URL 확장 요청 후 최종 URL로 처리 ===
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: 'resolveUrl', url: originalUrl },
                (response) => {
                    // 백그라운드에서 확장된 최종 주소
                    let finalUrl = originalUrl;
                    if (response && response.success && response.finalUrl) {
                        finalUrl = response.finalUrl;
                    }
    
                    // 아래부터는 기존 "originalUrl" 대신 "finalUrl" 기준으로 모든 로직 수행
                    const urlObj = new URL(finalUrl);
                    const { hostname, pathname } = urlObj;
    
                    // 1) bloupla.net 다중 링크
                    if (hostname === "bloupla.net") {
                        const blouplaMultiMatch = finalUrl.match(/^https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
                        if (blouplaMultiMatch) {
                            const allCodes = blouplaMultiMatch[1]; // "abcd,efgh,ijkl"
                            if (allCodes.includes(',')) {
                                const codeArr = allCodes.split(',');
                                const finalUrls = codeArr.map(c => `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${c}?alt=media`);
                                resolve({ type: 'multiple-img', urls: finalUrls });
                                return;
                            } else {
                                // 단일
                                resolve({ type: 'img', url: `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${allCodes}?alt=media` });
                                return;
                            }
                        }
                    }
    
                    // 2) 호스트가 ifh.cc
                    if (hostname === "ifh.cc") {
                        // (A) /v-
                        if (pathname.includes("/v-")) {
                            const splitV = pathname.split("/v-");
                            if (splitV.length >= 2) {
                                const codePart = splitV[1];
                                if (codePart.includes(".")) {
                                    const codes = codePart.split(".");
                                    const finalUrls = codes.map(c => `https://ifh.cc/g/${c}`);
                                    resolve({ type: 'multiple-img', urls: finalUrls });
                                    return;
                                } else {
                                    resolve({ type: 'img', url: `https://ifh.cc/g/${codePart}` });
                                    return;
                                }
                            }
                            resolve({ type: 'img', url: finalUrl });
                            return;
                        }
                        // (B) /i-
                        else if (pathname.includes("/i-")) {
                            const splitI = pathname.split("/i-");
                            if (splitI.length >= 2) {
                                const codePart = splitI[1];
                                resolve({ type: 'img', url: `https://ifh.cc/g/${codePart}` });
                                return;
                            }
                            resolve({ type: 'img', url: finalUrl });
                            return;
                        }
                        resolve({ type: 'img', url: finalUrl });
                        return;
                    }
    
                    // ifh.cc 비슷한 도메인들을 모두 통합적으로 처리
                    // i\d*fh.cc | if\d*h.cc | ifh\d*.cc | ifh.c\d*c | ifh.\d*cc 등을 커버
                    const match = finalUrl.match(
                        /^https?:\/\/(?:i\d*fh\.cc|if\d*h\.cc|ifh\d*\.cc|ifh\.c\d*c|ifh\.\d*cc)\/(v-|i-)([^/?#]+)/
                    );
                    
                    if (match) {
                        const [, prefix, codePart] = match; // prefix = 'v-' or 'i-', codePart = 실제 코드
                        const toIFH = (c) => `https://ifh.cc/g/${c}`;
                    
                        // 여러 개 처리
                        if (prefix === 'v-') {
                            if (codePart.includes('.')) {
                                const codes = codePart.split('.');
                                return resolve({ type: 'multiple-img', urls: codes.map(toIFH) });
                            }
                            return resolve({ type: 'img', url: toIFH(codePart) });
                        }
                    
                        // 단일 처리
                        return resolve({ type: 'img', url: toIFH(codePart) });
                    }   
    
                    // 7) ibb.co
                    if (hostname === "ibb.co") {
                        const shortCode = urlObj.pathname.substring(1);
                        chrome.runtime.sendMessage({ action: 'getIbbImage', shortCode }, (res) => {
                            if (res && res.success) {
                                resolve({ type: 'img', url: res.imageUrl });
                            } else {
                                resolve({ type: 'iframe', url: finalUrl });
                            }
                        });
                        return;
                    }
    
                    // i\d*bb.co | ib\d*b.co | ibb\d*.co | ibb.\d*co | ibb.c\d*o ...
                    let ibbMatch = finalUrl.match(
                        /^https?:\/\/(?:i\d*bb\.co|ib\d*b\.co|ibb\d*\.co|ibb\.\d*co|ibb\.c\d*o)\/([^/]+)$/
                    );
                    
                    if (ibbMatch) {
                        const shortCode = ibbMatch[1];
                        // 맨 뒤에 일치한 도메인을 ibb.co 로 교체
                        let apiUrl = finalUrl.replace(
                            /(i\d*bb\.co|ib\d*b\.co|ibb\d*\.co|ibb\.\d*co|ibb\.c\d*o)/,
                            'ibb.co'
                        );
                    
                        chrome.runtime.sendMessage({ action: 'getIbbImage', shortCode }, (res) => {
                            if (res && res.success) {
                                resolve({ type: 'img', url: res.imageUrl });
                            } else {
                                resolve({ type: 'iframe', url: apiUrl });
                            }
                        });
                        return;
                    }  
    
                    // 8) postimg.cc
                    let postimgMatch = finalUrl.match(/https?:\/\/postimg\.cc\/([^/]+)$/);
                    if (postimgMatch) {
                        const shortCode = postimgMatch[1];
                        chrome.runtime.sendMessage({ action: 'getPostimgImage', shortCode }, (res) => {
                            if (res && res.success) {
                                resolve({ type: 'img', url: res.imageUrl });
                            } else {
                                resolve({ type: 'iframe', url: finalUrl });
                            }
                        });
                        return;
                    }
    
                    let postimgGalleryMatch = finalUrl.match(/https?:\/\/postimg\.cc\/gallery\/([^/]+)/);
                    if (postimgGalleryMatch) {
                        const shortCode = postimgGalleryMatch[1];
                        chrome.runtime.sendMessage({ action: 'getPostimgGallery', shortCode }, (res) => {
                            if (res && res.success && res.images && res.images.length > 0) {
                                resolve({ type: 'multiple-img', urls: res.images });
                            } else {
                                resolve({ type: 'iframe', url: finalUrl });
                            }
                        });
                        return;
                    }
    
                    // 9) bloupla.net 단일
                    if (hostname === "bloupla.net") {
                        const blouplaMatch = finalUrl.match(/https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
                        if (blouplaMatch) {
                            const randomString = blouplaMatch[1];
                            resolve({
                                type: 'img',
                                url: `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${randomString}?alt=media`
                            });
                            return;
                        }
                    }
    
                    // 10) 기타 이미지 도메인들
                    let sdfMatch = finalUrl.match(/^https?:\/\/lemmy\.sdf\.org\/pictrs\/image\/(.+)/);
                    if (sdfMatch) {
                        const randomString = sdfMatch[1];
                        resolve({ type: 'img', url: `https://lemmy.sdf.org/pictrs/image/${randomString}` });
                        return;
                    }
    
                    let imgnewsMatch = finalUrl.match(/^https?:\/\/imgnews\.pstatic\.net\/image\/(.+)/);
                    if (imgnewsMatch) {
                        const randomString = imgnewsMatch[1];
                        resolve({ type: 'img', url: `https://imgnews.pstatic.net/image/${randomString}` });
                        return;
                    }
    
                    let baboboxMatch = finalUrl.match(/https?:\/\/baboboximg\.onrender\.com\/view\?file=(.+)$/);
                    if (baboboxMatch) {
                        const randomString = baboboxMatch[1];
                        resolve({ type: 'img', url: `https://baboboximg.onrender.com/images/${randomString}` });
                        return;
                    }
    
                    let bbbiMatch = finalUrl.match(/https?:\/\/bbbi\.onrender\.com\/v\?f=(.+)$/);
                    if (bbbiMatch) {
                        const randomString = bbbiMatch[1];
                        resolve({ type: 'img', url: `https://bbbi.onrender.com/images/${randomString}` });
                        return;
                    }
    
                    // playentry.org/uploads/ 이미지
                    if (hostname === "playentry.org" && pathname.includes("/uploads/")) {
                        resolve({ type: 'img', url: finalUrl });
                        return;
                    }
    
                    // space.playentry.org/world/
                    let spaceMatch = finalUrl.match(/https?:\/\/space\.playentry\.org\/world\/([^/]+)\/([^/]+)$/);
                    if (spaceMatch) {
                        const firstPart = spaceMatch[1];
                        resolve({ type: 'iframe', url: `https://space.playentry.org/world/${firstPart}` });
                        return;
                    }
    
                    // 유튜브 watch
                    let youtubeMatch = finalUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+)/);
                    if (youtubeMatch) {
                        const videoId = youtubeMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }
    
                    // YouTube Shorts
                    let youtubeShortsMatch = finalUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/shorts\/([^/?]+)/);
                    if (youtubeShortsMatch) {
                        const videoId = youtubeShortsMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }
    
                    // 유튜브 단축링크
                    let youtubeShortMatch = finalUrl.match(/https?:\/\/youtu\.be\/([^?]+)/);
                    if (youtubeShortMatch) {
                        const videoId = youtubeShortMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }
    
                    // streamable
                    let streamableMatch = finalUrl.match(/https?:\/\/streamable\.com\/([^&]+)/);
                    if (streamableMatch) {
                        const videoId = streamableMatch[1];
                        resolve({ type: 'iframe', url: `https://streamable.com/e/${videoId}` });
                        return;
                    }
    
                    // playentry project
                    let playentryMatch = finalUrl.match(/^https?:\/\/playentry\.org\/project\/([^/]+)/);
                    if (playentryMatch) {
                        const projectId = playentryMatch[1];
                        resolve({
                            type: 'iframe',
                            url: `https://playentry.org/iframe/${projectId}`
                        });
                        return;
                    }
    
                    // 그 외 도메인은 iframe 처리
                    resolve({ type: 'iframe', url: finalUrl });
                }
            );
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
        });

        container.appendChild(iframe);
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
        const posts = document.querySelectorAll(".css-6wq60h.e1i41bku1");
        posts.forEach(post => {
            // === 수정된 부분 시작 ===
            if (!post.dataset.converted) {
                let foundPreviewLink = false; 
                const links = post.querySelectorAll("a[href]");
                links.forEach(link => {
                    if (!link.hasAttribute('href')) return;
                    const hrefValue = link.getAttribute('href');
                    if (!hrefValue) return;

                    // /redirect?external=... 구조
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

                    // http:// 또는 https:// 로 시작하면 미리보기 삽입
                    if (finalUrl.startsWith('http://') || finalUrl.startsWith('https://')) {
                        insertPreviewContainer(link, finalUrl);
                        foundPreviewLink = true; 
                    }
                });

                // 만약 하나라도 미리보기 컨테이너가 생성되었다면 "converted" 처리
                if (foundPreviewLink) {
                    post.dataset.converted = "true";
                }
            }
            // === 수정된 부분 끝 ===
        });

        // 이제 미리보기 컨테이너들에 대해 실제 변환 로직 수행
        const containers = document.querySelectorAll('div[data-url]');
        for (const container of containers) {
            // 이미 처리 완료라면 건너뜀
            if (container.dataset.previewDone === "true") continue;

            const originalUrl = container.getAttribute('data-url');
            if (!isInViewport(container)) continue;

            const result = await transformUrlIfNeeded(originalUrl);

            if (result.type === 'multiple-img') {
                // 다중 이미지
                for (let singleUrl of result.urls) {
                    createImageElement(singleUrl, singleUrl, container);
                }
                container.dataset.previewDone = "true";
            } else {
                // 단일 항목
                const { type, url } = result;
                container.setAttribute('data-url', url);

                const existingElement = container.querySelector('[data-preview-img],[data-preview-video],[data-preview-iframe]');
                if (!existingElement) {
                    if (type === 'img') {
                        createImageElement(url, originalUrl, container);
                    } else if (type === 'video') {
                        createVideoElement(url, originalUrl, container);
                    } else {
                        createIframeElement(url, originalUrl, container);
                    }
                }
                container.dataset.previewDone = "true";
            }
        }
    }

    // 주기적으로 게시물 내부를 탐색하여 새로 추가된 링크 등을 업데이트
    setInterval(() => {
        processPosts();
    }, 500);
})();
