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

  // === [수정 후 유지] 단축 URL(예: naver.me) → 최종 주소만 반환 ===
  if (message.action === 'resolveUrl') {
    expandShortUrlIfNeeded(message.url)
      .then((finalUrl) => {
        // 이제 백그라운드에서는 **최종 링크만** 반환
        sendResponse({ success: true, finalUrl });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

/**
 * 단축 URL이면 fetch로 리다이렉트를 따라가 최종 주소를 반환.
 * 아닌 경우 그대로 반환.
 */
async function expandShortUrlIfNeeded(url) {
  // naver.me, bit.ly, tinyurl.com 등을 예시로 추가
  const shortUrlRegex = /^https?:\/\/(naver\.me|bit\.ly|tinyurl\.com|goo\.gl|kutt\.it)\//i;
  if (shortUrlRegex.test(url)) {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    return response.url;
  }
  return url;
}

/**
 * 1) 도메인을 정규식 패턴으로 변환하는 헬퍼 함수
 */
function makeDomainRegex(domain) {
  const escapedDomain = domain.replace(/\./g, "\\.");
  return `^https?://([^/]*\\.)?${escapedDomain}(/|$)`;
}

/**
 * 2) 화이트리스트 도메인 목록
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
  // 규칙 1: (우선순위 1) 모든 iframe에 대해 script-src 'none'을 강제 주입
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
      initiatorDomains: ["playentry.org"]
    }
  };

  // 규칙 2: (우선순위 2) 화이트리스트에 대해서는 CSP를 제거(= JS 허용)
  const allowScriptRules = WHITELIST_PATTERNS.map((pattern, index) => ({
    id: 100 + index,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "Content-Security-Policy",
          operation: "remove"
        }
      ]
    },
    condition: {
      resourceTypes: ["sub_frame"],
      regexFilter: pattern,
      initiatorDomains: ["playentry.org"]
    }
  }));

  // 규칙 3: (우선순위 3) 블랙리스트 경로에 대해서는 iframe 자체 차단
  const blacklistRules = BLACKLIST_PATTERNS.map((pattern, index) => ({
    id: 1000 + index,
    priority: 3,
    action: {
      type: "block"
    },
    condition: {
      resourceTypes: ["sub_frame"],
      regexFilter: pattern,
      initiatorDomains: ["playentry.org"]
    }
  }));

  // 모든 규칙 ID를 모아 기존 동일 ID 규칙 제거 후 새 규칙 등록
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
      console.log(
        "[Extension] iframe JS 차단 + 화이트리스트 허용 + 블랙리스트 차단 규칙 적용 완료!"
      );
    }
  );
});
