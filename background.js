chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  });
  

// 도메인을 정규식 패턴으로 변환하는 헬퍼 함수
function makeDomainRegex(domain) {
  const escapedDomain = domain.replace(/\./g, "\\.");
  return `^https?://([^/]*\\.)?${escapedDomain}(/|$)`;
}

// 화이트리스트 도메인(iframe 허용)
const WHITELIST_DOMAINS = [
  "bloupla.net",
  "playentry.org",
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
  "www.miricanvas.com"
];

// 화이트리스트 도메인을 정규식 패턴으로 변환
const WHITELIST_PATTERNS = WHITELIST_DOMAINS.map(domain => makeDomainRegex(domain));

// 블랙리스트 패턴: 화이트리스트 중 특정 경로 다시 차단
// 예: playentry.org/signout 경로를 차단하려면:
const BLACKLIST_PATTERNS = [
  "^https://playentry\\.org/signout(/|$)"
];

chrome.runtime.onInstalled.addListener(() => {
  // 1. 모든 iframe 로드를 차단하는 규칙 (우선순위 1)
  const blockAllIframesRule = {
    id: 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      resourceTypes: ["sub_frame"]
    }
  };

  // 2. 화이트리스트 도메인 iframe 허용 규칙 (우선순위 2)
  const allowRules = WHITELIST_PATTERNS.map((pattern, index) => ({
    id: 100 + index,
    priority: 2,
    action: { type: "allow" },
    condition: {
      resourceTypes: ["sub_frame"],
      regexFilter: pattern
    }
  }));

  // 3. 블랙리스트 규칙 (우선순위 3)
  // 화이트리스트에 해당하는 iframe이라도 여기서 특정 경로는 다시 차단
  const blacklistRules = BLACKLIST_PATTERNS.map((pattern, index) => ({
    id: 1000 + index,
    priority: 3,
    action: { type: "block" },
    condition: {
      resourceTypes: ["sub_frame"],
      regexFilter: pattern
    }
  }));

  const allRuleIds = [1, ...allowRules.map(r => r.id), ...blacklistRules.map(r => r.id)];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: allRuleIds,
    addRules: [blockAllIframesRule, ...allowRules, ...blacklistRules]
  }, () => {
    console.log("iframe 차단/허용 룰 적용 완료");
  });
});
