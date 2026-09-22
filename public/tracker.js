/**
 * UtmTracker Client Script
 * Lightweight, zero-dependency client-side tracking and checkout link decorator.
 */
(function () {
  if (typeof window === "undefined") return;
  if (window.__utmTrackerLoaded) return;
  window.__utmTrackerLoaded = true;

  // Determine API base URL from script tag source
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf("tracker.js") !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  var apiBase = "";
  var defaultProductSlug = "";

  if (currentScript) {
    try {
      var scriptUrl = new URL(currentScript.src, window.location.href);
      apiBase = scriptUrl.origin;
      defaultProductSlug =
        currentScript.getAttribute("data-product") ||
        scriptUrl.searchParams.get("product") ||
        "";
    } catch (e) {
      apiBase = "";
    }
  }

  // Cookie helpers
  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setCookie(name, value, days) {
    var expires = "";
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    // Set across root domain if possible
    var domainParts = window.location.hostname.split(".");
    var domain = "";
    if (domainParts.length >= 2 && !/^\d+$/.test(domainParts[domainParts.length - 1])) {
      domain = "; domain=." + domainParts.slice(-2).join(".");
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/" + domain + "; SameSite=Lax";
  }

  // URL & Storage helpers
  var currentUrl = new URL(window.location.href);
  var searchParams = currentUrl.searchParams;

  var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var utms = {};

  // Read UTMs from URL or fallback to sessionStorage
  for (var k = 0; k < utmKeys.length; k++) {
    var key = utmKeys[k];
    var val = searchParams.get(key);
    if (val) {
      utms[key] = val;
      try { sessionStorage.setItem(key, val); } catch (e) {}
    } else {
      try {
        var stored = sessionStorage.getItem(key);
        if (stored) utms[key] = stored;
      } catch (e) {}
    }
  }

  var fbclid = searchParams.get("fbclid");
  if (fbclid) {
    try { sessionStorage.setItem("fbclid", fbclid); } catch (e) {}
  } else {
    try { fbclid = sessionStorage.getItem("fbclid"); } catch (e) {}
  }

  // Handle Meta Cookies (_fbc & _fbp)
  var fbc = getCookie("_fbc");
  if (!fbc && fbclid) {
    fbc = "fb.1." + Date.now() + "." + fbclid;
    setCookie("_fbc", fbc, 90);
  }

  var fbp = getCookie("_fbp");
  if (!fbp) {
    fbp = "fb.1." + Date.now() + "." + Math.floor(Math.random() * 1000000000);
    setCookie("_fbp", fbp, 90);
  }

  var productSlug = searchParams.get("product") || defaultProductSlug;

  // Stored click ID if available in this session
  var clickId = null;
  try {
    clickId = sessionStorage.getItem("__tracker_click_id");
  } catch (e) {}

  // Domains of popular checkout platforms
  var checkoutDomains = [
    "kiwify.com.br",
    "pay.kiwify.com.br",
    "hotmart.com",
    "pay.hotmart.com",
    "eduzz.com",
    "sun.eduzz.com",
    "monetizze.com.br",
    "cakto.com.br",
    "kirvano.com",
    "braip.com",
    "greenn.com.br",
    "yampi.com.br"
  ];

  function isCheckoutUrl(urlStr) {
    if (!urlStr || typeof urlStr !== "string") return false;
    for (var i = 0; i < checkoutDomains.length; i++) {
      if (urlStr.indexOf(checkoutDomains[i]) !== -1) return true;
    }
    return false;
  }

  function decorateUrl(urlStr) {
    if (!urlStr || typeof urlStr !== "string") return urlStr;
    try {
      var u = new URL(urlStr, window.location.href);
      if (!isCheckoutUrl(u.hostname) && !u.searchParams.get("force_tracker")) {
        return urlStr;
      }

      // Append click ID as sck and src
      if (clickId) {
        u.searchParams.set("sck", clickId);
        u.searchParams.set("src", clickId);
      }

      // Append UTMs
      for (var param in utms) {
        if (utms[param] && !u.searchParams.has(param)) {
          u.searchParams.set(param, utms[param]);
        }
      }

      return u.toString();
    } catch (err) {
      return urlStr;
    }
  }

  function decorateLinks() {
    var links = document.querySelectorAll("a[href], button[data-href], form[action]");
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      if (el.tagName === "A" && el.href) {
        var newHref = decorateUrl(el.href);
        if (newHref !== el.href) {
          el.href = newHref;
        }
      } else if (el.getAttribute("data-href")) {
        var dHref = el.getAttribute("data-href");
        var decorated = decorateUrl(dHref);
        if (decorated !== dHref) {
          el.setAttribute("data-href", decorated);
        }
      } else if (el.tagName === "FORM" && el.action) {
        var newAction = decorateUrl(el.action);
        if (newAction !== el.action) {
          el.action = newAction;
        }
      }
    }
  }

  // Intercept clicks on links right as the user clicks (handles late-loaded or dynamic URLs)
  document.addEventListener(
    "click",
    function (e) {
      var target = e.target;
      while (target && target !== document) {
        if (target.tagName === "A" && target.href) {
          target.href = decorateUrl(target.href);
          break;
        }
        target = target.parentNode;
      }
    },
    true
  );

  // Send click tracking payload to API
  function registerClick() {
    var payload = {
      product_slug: productSlug,
      utm_source: utms.utm_source || null,
      utm_medium: utms.utm_medium || null,
      utm_campaign: utms.utm_campaign || null,
      utm_content: utms.utm_content || null,
      utm_term: utms.utm_term || null,
      fbclid: fbclid || null,
      fbc: fbc || null,
      fbp: fbp || null,
      page_url: window.location.href,
      referrer: document.referrer || null,
    };

    var endpoint = (apiBase || "") + "/api/track/click";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.click_id) {
          clickId = data.click_id;
          try {
            sessionStorage.setItem("__tracker_click_id", clickId);
          } catch (e) {}
          decorateLinks();
        }
      })
      .catch(function (err) {
        console.warn("[Tracker] Could not register click:", err);
      });
  }

  // Execute
  if (!clickId) {
    registerClick();
  } else {
    decorateLinks();
  }

  // Observer to decorate links injected dynamically
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      decorateLinks();
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // Periodic safety check
  setInterval(decorateLinks, 2000);
})();
