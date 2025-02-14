// content.js

// ------------------------------------------------------
// [A] 원본: "엔트리 이야기"를 "엔트리 이야기🔭"로 교체하는 코드
// (첫 진입 시, 또는 이미 해당 페이지에서 로드되었을 때 동작)
if (window.location.href.startsWith("https://playentry.org/community/entrystory/")) {
    // 바꾸고자 하는 새 문구
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

// ------------------------------------------------------
// [B] 원본: 게시글 내 링크들의 미리보기(이미지, 영상, iframe 등) 처리 로직
(function() {
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
            if (domain.endsWith("firebasestorage.googleapis.com")) return "#0000DD"; // 임시대처
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
        if (!finalUrl) return; // (기존) finalUrl이 유효하지 않으면 중단

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

        return new Promise((resolve) => {
            chrome.runtime.sendMessage(
                { action: 'resolveUrl', url: originalUrl },
                (response) => {
                    // 백그라운드에서 확장된 최종 주소
                    let finalUrl = originalUrl;
                    if (response && response.success && response.finalUrl) {
                        finalUrl = response.finalUrl;
                    }

                    // http -> https (혼합콘텐츠 방지)
                    if (finalUrl.startsWith("http://playentry.org/")) {
                        finalUrl = finalUrl.replace("http://playentry.org/", "https://playentry.org/");
                    }
                    if (finalUrl.startsWith("http://ncc.playentry.org/")) {
                        finalUrl = finalUrl.replace("http://ncc.playentry.org/", "https://ncc.playentry.org/");
                    }

                    const decodedUrl = decodeURI(finalUrl);

                    // signout 경로면 => 차단
                    if (/^https?:\/\/(?:ncc\.)?playentry\.org\/signout.*/.test(decodedUrl)) {
                        resolve({ type: 'block' });
                        return;
                    }

                    const urlObj = new URL(decodedUrl);
                    const { hostname, pathname } = urlObj;

                    // 1) bloupla.net 다중 링크
                    if (hostname === "bloupla.net") {
                        const blouplaMultiMatch = decodedUrl.match(/^https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
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

                    // 2) 호스트 ifh.cc
                    if (hostname === "ifh.cc") {
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
                            resolve({ type: 'img', url: decodedUrl });
                            return;
                        }
                        else if (pathname.includes("/i-")) {
                            const splitI = pathname.split("/i-");
                            if (splitI.length >= 2) {
                                const codePart = splitI[1];
                                resolve({ type: 'img', url: `https://ifh.cc/g/${codePart}` });
                                return;
                            }
                            resolve({ type: 'img', url: decodedUrl });
                            return;
                        }
                        resolve({ type: 'img', url: decodedUrl });
                        return;
                    }

                    // ifh.cc 계열 도메인
                    const match = decodedUrl.match(
                        /^https?:\/\/(?:i\d*fh\.cc|if\d*h\.cc|ifh\d*\.cc|ifh\.c\d*c|ifh\.\d*cc)\/(v-|i-)([^/?#]+)/
                    );
                    if (match) {
                        const [, prefix, codePart] = match; // prefix = 'v-' or 'i-'
                        const toIFH = (c) => `https://ifh.cc/g/${c}`;

                        if (prefix === 'v-') {
                            if (codePart.includes('.')) {
                                const codes = codePart.split('.');
                                return resolve({ type: 'multiple-img', urls: codes.map(toIFH) });
                            }
                            return resolve({ type: 'img', url: toIFH(codePart) });
                        }
                        // i-
                        return resolve({ type: 'img', url: toIFH(codePart) });
                    }

                    // ifh.cc /g/ 패턴
                    const gMatch = decodedUrl.match(
                        /^https?:\/\/(?:i\d*fh\.cc|if\d*h\.cc|ifh\d*\.cc|ifh\.c\d*c|ifh\.\d*cc)\/g\/([^/?#]+)/
                    );
                    if (gMatch) {
                        const [, codePart] = gMatch;
                        const toIFH = (c) => `https://ifh.cc/g/${c}`;
                        return resolve({ type: 'img', url: toIFH(codePart) });
                    }

                    // 7) ibb.co
                    if (hostname === "ibb.co") {
                        const shortCode = pathname.substring(1);
                        chrome.runtime.sendMessage({ action: 'getIbbImage', shortCode }, (res) => {
                            if (res && res.success) {
                                resolve({ type: 'img', url: res.imageUrl });
                            } else {
                                resolve({ type: 'iframe', url: decodedUrl });
                            }
                        });
                        return;
                    }

                    // i\d*bb.co 등등
                    let ibbMatch = decodedUrl.match(
                        /^https?:\/\/(?:i\d*bb\.co|ib\d*b\.co|ibb\d*\.co|ibb\.\d*co|ibb\.c\d*o)\/([^/]+)$/
                    );
                    if (ibbMatch) {
                        const shortCode = ibbMatch[1];
                        let apiUrl = decodedUrl.replace(
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
                    let postimgMatch = decodedUrl.match(/https?:\/\/postimg\.cc\/([^/]+)$/);
                    if (postimgMatch) {
                        const shortCode = postimgMatch[1];
                        chrome.runtime.sendMessage({ action: 'getPostimgImage', shortCode }, (res) => {
                            if (res && res.success) {
                                resolve({ type: 'img', url: res.imageUrl });
                            } else {
                                resolve({ type: 'iframe', url: decodedUrl });
                            }
                        });
                        return;
                    }
                    let postimgGalleryMatch = decodedUrl.match(/https?:\/\/postimg\.cc\/gallery\/([^/]+)/);
                    if (postimgGalleryMatch) {
                        const shortCode = postimgGalleryMatch[1];
                        chrome.runtime.sendMessage({ action: 'getPostimgGallery', shortCode }, (res) => {
                            if (res && res.success && res.images && res.images.length > 0) {
                                resolve({ type: 'multiple-img', urls: res.images });
                            } else {
                                resolve({ type: 'iframe', url: decodedUrl });
                            }
                        });
                        return;
                    }

                    // 9) bloupla.net 단일
                    if (hostname === "bloupla.net") {
                        const blouplaMatch = decodedUrl.match(/https?:\/\/bloupla\.net\/img\/\?\=(.+)$/);
                        if (blouplaMatch) {
                            const randomString = blouplaMatch[1];
                            resolve({
                                type: 'img',
                                url: `https://firebasestorage.googleapis.com/v0/b/imgshare-2.appspot.com/o/${randomString}?alt=media`
                            });
                            return;
                        }
                    }

                    // 기타...
                    let sdfMatch = decodedUrl.match(/^https?:\/\/lemmy\.sdf\.org\/pictrs\/image\/(.+)/);
                    if (sdfMatch) {
                        const randomString = sdfMatch[1];
                        resolve({ type: 'img', url: `https://lemmy.sdf.org/pictrs/image/${randomString}` });
                        return;
                    }
                    let imgnewsMatch = decodedUrl.match(/^https?:\/\/imgnews\.pstatic\.net\/image\/(.+)/);
                    if (imgnewsMatch) {
                        const randomString = imgnewsMatch[1];
                        resolve({ type: 'img', url: `https://imgnews.pstatic.net/image/${randomString}` });
                        return;
                    }
                    let baboboxMatch = decodedUrl.match(/https?:\/\/baboboximg\.onrender\.com\/view\?file=(.+)$/);
                    if (baboboxMatch) {
                        const randomString = baboboxMatch[1];
                        resolve({ type: 'img', url: `https://baboboximg.onrender.com/images/${randomString}` });
                        return;
                    }
                    let bbbiMatch = decodedUrl.match(/https?:\/\/bbbi\.onrender\.com\/v\?f=(.+)$/);
                    if (bbbiMatch) {
                        const randomString = bbbiMatch[1];
                        resolve({ type: 'img', url: `https://bbbi.onrender.com/images/${randomString}` });
                        return;
                    }
                    if (hostname === "playentry.org" && pathname.includes("/uploads/")) {
                        resolve({ type: 'img', url: decodedUrl });
                        return;
                    }
                    let spaceMatch = decodedUrl.match(/https?:\/\/space\.playentry\.org\/world\/([^/]+)\/([^/]+)$/);
                    if (spaceMatch) {
                        const firstPart = spaceMatch[1];
                        resolve({ type: 'iframe', url: `https://space.playentry.org/world/${firstPart}` });
                        return;
                    }

                    // YouTube 모바일 watch (정규식 수정)
                    let youtubeMobileWatchMatch = decodedUrl.match(/https?:\/\/m\.youtube\.com\/watch\?(?:.*&)?v=([^&]+)/);
                    if (youtubeMobileWatchMatch) {
                        const videoId = youtubeMobileWatchMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }

                    // YouTube 모바일 Shorts
                    let youtubeMobileShortsMatch = decodedUrl.match(/https?:\/\/m\.youtube\.com\/shorts\/([^/?]+)/);
                    if (youtubeMobileShortsMatch) {
                        const videoId = youtubeMobileShortsMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }

                    // YouTube watch (정규식 수정)
                    let youtubeMatch = decodedUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([^&]+)/);
                    if (youtubeMatch) {
                        const videoId = youtubeMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }

                    // YouTube Shorts
                    let youtubeShortsMatch = decodedUrl.match(/https?:\/\/(?:www\.)?youtube\.com\/shorts\/([^/?]+)/);
                    if (youtubeShortsMatch) {
                        const videoId = youtubeShortsMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }

                    // 유튜브 단축
                    let youtubeShortMatch = decodedUrl.match(/https?:\/\/youtu\.be\/([^?]+)/);
                    if (youtubeShortMatch) {
                        const videoId = youtubeShortMatch[1];
                        resolve({ type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` });
                        return;
                    }

                    // streamable
                    let streamableMatch = decodedUrl.match(/https?:\/\/streamable\.com\/([^&]+)/);
                    if (streamableMatch) {
                        const videoId = streamableMatch[1];
                        resolve({ type: 'iframe', url: `https://streamable.com/e/${videoId}` });
                        return;
                    }

                    // playentry project
                    let playentryMatch = decodedUrl.match(/^https?:\/\/playentry\.org\/project\/([^/]+)/);
                    if (playentryMatch) {
                        const projectId = playentryMatch[1];
                        resolve({
                            type: 'iframe',
                            url: `https://bloupla.net/project-preview/?=https://playentry.org/project/${projectId}`,
                            customHeight: 395
                        });
                        return;
                    }

                    // 그 외 도메인 => iframe 처리
                    resolve({ type: 'iframe', url: decodedUrl });
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
        video.setAttribute('data-original-link', originalUrl);
        video.setAttribute('data-final-link', url);

        video.src = url;
        video.style.maxWidth = "99%";
        video.style.maxHeight = "400px";
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
    function createIframeElement(url, originalUrl, container, customHeight) {
        const iframe = document.createElement("iframe");
        iframe.setAttribute('data-preview-iframe', 'true');
        iframe.setAttribute('data-original-link', originalUrl);
        iframe.setAttribute('data-final-link', url);

        iframe.src = url;
        iframe.style.width = "99%";
        iframe.style.height = customHeight ? customHeight + "px" : "400px";
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
        img.setAttribute('data-original-link', originalUrl);
        img.setAttribute('data-final-link', url);

        img.src = url;
        img.style.maxWidth = "99%";
        img.style.maxHeight = "400px";
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
     * 실제로 게시물 내부의 링크들을 순회하며 컨테이너 삽입 & 미리보기
     */
    async function processPosts() {
        const posts = document.querySelectorAll(".css-6wq60h.e1i41bku1");
        posts.forEach(post => {
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

                if (foundPreviewLink) {
                    post.dataset.converted = "true";
                }
            }
        });

        // 이제 미리보기 컨테이너들에 대해 실제 변환 로직 수행
        const containers = document.querySelectorAll('div[data-url]');
        for (const container of containers) {
            // 이미 처리 완료이면 스킵
            if (container.dataset.previewDone === "true") continue;
            // 처리중이면 스킵(중복처리 방지)
            if (container.dataset.previewProcessing === "true") continue;
            
            container.dataset.previewProcessing = "true";

            const originalUrl = container.getAttribute('data-url');
            if (!isInViewport(container)) {
                // 뷰포트 밖이면 다음 기회에
                delete container.dataset.previewProcessing;
                continue;
            }

            const result = await transformUrlIfNeeded(originalUrl);

            // block이면 => signout 차단
            if (result.type === 'block') {
                container.dataset.previewDone = "true";
                const prev = container.previousElementSibling;
                if (prev && prev.tagName === 'A') {
                    prev.remove();
                }
                container.remove();
                continue;
            }

            if (result.type === 'multiple-img') {
                // 다중 이미지
                for (let singleUrl of result.urls) {
                    createImageElement(singleUrl, originalUrl, container);
                    const br = document.createElement('br');
                    container.appendChild(br);
                }
                container.dataset.previewDone = "true";
            } else {
                // 단일 항목
                const { type, url, customHeight } = result;
                container.setAttribute('data-url', url);

                const existingElement = container.querySelector('[data-preview-img],[data-preview-video],[data-preview-iframe]');
                if (!existingElement) {
                    if (type === 'img') {
                        createImageElement(url, originalUrl, container);
                    } else if (type === 'video') {
                        createVideoElement(url, originalUrl, container);
                    } else {
                        createIframeElement(url, originalUrl, container, customHeight);
                    }
                }
                container.dataset.previewDone = "true";
            }

            delete container.dataset.previewProcessing;
        }
    }

    // 주기적으로 게시물 내부를 탐색하여 새로 추가된 링크 등을 업데이트
    setInterval(() => {
        processPosts();
    }, 500);
})();

// ------------------------------------------------------
// [C] 추가 로직: "새로고침 없이" URL이 바뀌어도, community/entrystory 페이지라면
//               위 [A]의 "엔트리 이야기🔭" 치환 기능이 재적용되도록 감시
(function() {
    let lastUrl = window.location.href;

    setInterval(() => {
        // URL이 변경되었는지 체크
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;

            // 변경된 URL이 "community/entrystory/"로 시작한다면 제목 치환 재실행
            if (lastUrl.startsWith("https://playentry.org/community/entrystory/")) {
                // 아래는 [A]의 코드와 동일
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
                            observer.disconnect();
                        }
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            }
        }
    }, 500);
})();
