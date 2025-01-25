// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // [기존 코드] ibb.co 처리
  if (message.action === 'getIbbImage') {
    const shortCode = message.shortCode;
    fetch(`https://ibb.co/${shortCode}`)
      .then(r => r.text())
      .then(html => {
        let imageUrlMatch = html.match(/property="og:image"\s*content="([^"]+)"/);
        if (imageUrlMatch && imageUrlMatch[1]) {
          sendResponse({success: true, imageUrl: imageUrlMatch[1]});
        } else {
          sendResponse({success: false});
        }
      })
      .catch(() => {
        sendResponse({success: false});
      });
    return true; 
  }

  // [기존 코드] postimg 이미지 처리
  if (message.action === 'getPostimgImage') {
    const shortCode = message.shortCode;
    fetch(`https://postimg.cc/${shortCode}`)
      .then(r => r.text())
      .then(html => {
        let imageUrlMatch = html.match(/property="og:image"\s*content="([^"]+)"/);
        if (imageUrlMatch && imageUrlMatch[1]) {
          sendResponse({success: true, imageUrl: imageUrlMatch[1]});
        } else {
          sendResponse({success: false});
        }
      })
      .catch(() => {
        sendResponse({success: false});
      });
    return true;
  }

  // [기존 코드] postimg 갤러리 처리
  if (message.action === 'getPostimgGallery') {
    const shortCode = message.shortCode;
    fetch(`https://postimg.cc/gallery/${shortCode}`)
      .then(r => r.text())
      .then(html => {
        const bgImageRegex = /background-image\s*:\s*url\('([^']+)'\)/g;
        let match;
        const imageUrls = [];

        while ((match = bgImageRegex.exec(html)) !== null) {
          const foundUrl = match[1];
          if (foundUrl.startsWith("https://i.postimg.cc/")) {
            imageUrls.push(foundUrl);
          }
        }

        if (imageUrls.length > 0) {
          sendResponse({
            success: true,
            images: imageUrls
          });
        } else {
          sendResponse({ success: false });
        }
      })
      .catch(() => {
        sendResponse({ success: false });
      });

    return true; // 비동기 응답
  }

  // [수정] 단축 URL(예: naver.me 등) → 최종 주소 반환
  if (message.action === 'resolveUrl') {
    expandShortUrlIfNeeded(message.url)
      .then((finalUrl) => {
        sendResponse({ success: true, finalUrl });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // 비동기 처리
  }
});

/**
 * 단축 URL이면 fetch로 3xx 리다이렉트 따라가 최종 주소를 반환.
 * 3xx가 없는데 HTML에 meta refresh 혹은 JS로 location 이동이 있으면 파싱.
 * 그 외는 그대로 반환.
 */
async function expandShortUrlIfNeeded(url) {
  // naver.me, bit.ly, tinyurl.com 등을 예시로 추가
  const shortUrlRegex = /^https?:\/\/(naver\.me|bit\.ly|tinyurl\.com|goo\.gl|kutt\.it)\//i;
  
  // 1) 일반 케이스: 3xx 리다이렉트를 따라가기
  let response;
  try {
    response = await fetch(url, { method: 'GET', redirect: 'follow' });
  } catch (e) {
    // fetch 실패하면 어쩔 수 없이 원본 반환
    return url;
  }

  // response.url = 최종 리다이렉트된 주소
  let finalUrl = response.url;

  // 2) 만약 최종 주소가 원본이랑 같다면, 3xx가 아닌 HTML상의 meta/js 리프레시를 검사
  if (finalUrl === url) {
    try {
      const text = await response.text();
      // (a) 메타 리프레시
      let metaMatch = text.match(/<meta[^>]+http-equiv=["']refresh["'][^>]*content=["']\s*\d*\s*;\s*url=(.*?)["']/i);
      if (metaMatch && metaMatch[1]) {
        finalUrl = metaMatch[1];
      } else {
        // (b) window.location / location.href / document.location 등 단순 JS 패턴
        let jsMatch = text.match(/window\.(?:location|location\.href)\s*=\s*["']([^"']+)["']/i);
        if (!jsMatch) {
          jsMatch = text.match(/(?:location|document\.location)\s*=\s*["']([^"']+)["']/i);
        }
        if (jsMatch && jsMatch[1]) {
          finalUrl = jsMatch[1];
        }
      }
    } catch (e) {
      // HTML 파싱 실패 시에는 그냥 finalUrl = response.url 유지
    }
  }

  // 3) 만약 여전히 finalUrl가 단축URL 형태라면 더 이상 파싱할 수 없으니 그대로 반환
  if (shortUrlRegex.test(finalUrl) && finalUrl !== url) {
    // 무한루프 방지용: 여기서 한 번만 반복
    return finalUrl;
  }

  // 그 외
  return finalUrl;
}

/**
 * 1) 도메인을 정규식 패턴으로 변환하는 헬퍼 함수
 */
function makeDomainRegex(domain) {
  const escapedDomain = domain.replace(/\./g, "\\.");
  return `^https?://([^/]*\\.)?${escapedDomain}(/|$)`;
}

/**
 * 2) 화이트리스트 도메인 목록 (전역)
 */
const WHITELIST_DOMAINS = [
  "bloupla.net",
  "playentry.org",
  "ncc.playentry.org",
  "ifh.cc",
  "i1fh.cc",
  "if1h.cc",
  "ifh1.cc",
  "ifh.1cc",
  "ifh.c1c",
  "i.postimg.cc",
  "postimg.cc",
  "baboboximg.onrender.com",
  "youtube.com",
  "youtu.be",
  "m.youtube.com",
  "naver.me",
  "tree.joody.day",
  "colormytree.me",
  "ibb.co",
  "i1bb.co",
  "ib1b.co",
  "ibb1.co",
  "ibb.1co",
  "ibb.c1o",
  "snowman.quizby.me",
  "www.miricanvas.com",
  "entrypancake.p-e.kr",
  "xn--hj2bx5ym4f.org",
  "imgnews.pstatic.net",
  "www.youtube-nocookie.com",
  "quizby.me",
  "streamable.com",
  "dutmoticon.tica.fun",
  "musiclab.chromeexperiments.com",
  "bbbi.onrender.com"
];

// 화이트리스트 도메인들을 정규식 배열로 변환
const WHITELIST_PATTERNS = WHITELIST_DOMAINS.map(makeDomainRegex);

/**
 * 3) 블랙리스트 패턴
 */
const BLACKLIST_PATTERNS = [
  "^https?://playentry\\.org/signout.*",
  "^https?://ncc\\.playentry\\.org/signout.*"
];

/**
 * 4) 설치(또는 업데이트)될 때 동적으로 규칙을 설정
 */
chrome.runtime.onInstalled.addListener(() => {

  // ------------------------------------------------
  // 1) (예) 모든 iframe에 대해 script-src 'none' 강제
  //    (원래 쓰시던 rule)
  // ------------------------------------------------
  const blockAllScriptsInIframesRule = {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "Content-Security-Policy",
          operation: "set",
          value: [
            "default-src * data: blob:;", 
            "script-src 'none';",          
            "style-src * 'unsafe-inline';",
            "font-src * data:;",           
            "img-src * data:;"             
          ].join(" ")
        }
      ]
    },
    condition: {
      resourceTypes: ["sub_frame"],
      // [수정] ncc.playentry.org 에서도 iframe 로드 시 동일 규칙 적용
      initiatorDomains: ["playentry.org", "ncc.playentry.org"]
    }
  };

  // ------------------------------------------------
  // 2) (예) 화이트리스트(도메인)에서는 CSP를 remove
  //    (원래 쓰시던 rule)
  // ------------------------------------------------

  // [중요] 이미 전역에서 WHITELIST_DOMAINS / WHITELIST_PATTERNS 정의했으므로 그대로 사용
  const allowScriptRules = WHITELIST_PATTERNS.map((pattern, idx) => ({
    id: 100 + idx,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "Content-Security-Policy", operation: "remove" }
      ]
    },
    condition: {
      resourceTypes: ["sub_frame"],
      regexFilter: pattern,
      // [수정] "ncc.playentry.org"도 포함
      initiatorDomains: ["playentry.org", "ncc.playentry.org"]
    }
  }));

  // ------------------------------------------------
  // 3) 블랙리스트 - signout 완전 차단
  // ------------------------------------------------
  // 여기서 핵심은 resourceTypes를 충분히 지정해
  // 어떤 방법으로든 요청이 나가면 무조건 차단
  const blacklistRules = BLACKLIST_PATTERNS.map((pattern, index) => ({
    id: 1000 + index,
    priority: 3,
    action: { type: "block" },
    condition: {
      resourceTypes: [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "font",
        "media",
        "websocket",
        "webtransport",
        "webbundle",
        "other"
      ],
      regexFilter: pattern
      // 완전 차단을 위해 initiatorDomains는 사용 안 함
    }
  }));

  // ------------------------------------------------
  // 4) 모든 룰을 합쳐서 등록
  // ------------------------------------------------
  const allRuleIds = [
    blockAllScriptsInIframesRule.id,
    ...allowScriptRules.map(r => r.id),
    ...blacklistRules.map(r => r.id)
  ];

  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: allRuleIds,
      addRules: [
        blockAllScriptsInIframesRule,
        ...allowScriptRules,
        ...blacklistRules
      ]
    },
    () => {
      console.log("=== DNR 규칙 적용 완료: signout 100% 차단 ===");
    }
  );
});
