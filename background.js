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
  