var background = function() {
  "use strict";
  var _a, _b;
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  async function reloadAllTabs() {
    try {
      const tabs = await browser.tabs.query({});
      const reloadPromises = tabs.filter(
        (tab) => tab.url && (tab.url.startsWith("http://") || tab.url.startsWith("https://"))
      ).map(async (tab) => {
        try {
          await browser.tabs.reload(tab == null ? void 0 : tab.id);
          console.log(`✓ Rechargé: ${tab.url}`);
        } catch (error) {
          console.warn(`✗ Échec rechargement onglet ${tab.id}:`, error);
        }
      });
      await Promise.all(reloadPromises);
      console.log("Tous les onglets ont été traités");
    } catch (error) {
      console.error("Erreur lors du rechargement:", error);
    }
  }
  const definition = defineBackground(() => {
    let tabShuffleInterval = null;
    let exampleTabsWithMouseOut = /* @__PURE__ */ new Set();
    browser.runtime.onInstalled.addListener(async (details) => {
      console.log("Extension installée/activée:", details.reason);
      await reloadAllTabs();
    });
    browser.runtime.onStartup.addListener(async () => {
      console.log("Extension démarrée");
      await reloadAllTabs();
    });
    chrome.runtime.onMessage.addListener((message, sender) => {
      var _a2;
      if (message.type === "MOUSE_OUTSIDE" && ((_a2 = sender.tab) == null ? void 0 : _a2.id)) {
        const tabId = sender.tab.id;
        if (message.isOutside) {
          exampleTabsWithMouseOut.add(tabId);
        } else {
          exampleTabsWithMouseOut.delete(tabId);
        }
        if (exampleTabsWithMouseOut.size > 0 && !tabShuffleInterval) {
          console.log("Démarrage du mélange des onglets");
          tabShuffleInterval = setInterval(async () => {
            var _a3, _b2;
            try {
              const tabs = await chrome.tabs.query({ currentWindow: true });
              if (tabs.length > 1) {
                const indices = tabs.map((_, index) => index);
                for (let i = indices.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                for (let i = 0; i < tabs.length; i++) {
                  if (tabs[i].id && indices[i] !== i) {
                    await chrome.tabs.move((_a3 = tabs[i]) == null ? void 0 : _a3.id, { index: indices[i] });
                  }
                }
                for (let i = 0; i < tabs.length; i++) {
                  if (tabs[i].id) {
                    await chrome.scripting.executeScript({
                      target: { tabId: (_b2 = tabs[i]) == null ? void 0 : _b2.id },
                      func: (newTitle) => {
                        document.title = newTitle;
                      },
                      args: ["example.com"]
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Erreur lors du mélange des onglets:", error);
            }
          }, 100);
        } else if (exampleTabsWithMouseOut.size === 0 && tabShuffleInterval) {
          console.log("Arrêt du mélange des onglets");
          clearInterval(tabShuffleInterval);
          tabShuffleInterval = null;
        }
      }
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      exampleTabsWithMouseOut.delete(tabId);
      if (exampleTabsWithMouseOut.size === 0 && tabShuffleInterval) {
        clearInterval(tabShuffleInterval);
        tabShuffleInterval = null;
      }
    });
    const exampleTabs = /* @__PURE__ */ new Set();
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        if (tab.url.startsWith("https://example.com")) {
          exampleTabs.add(tabId);
          console.log(`Onglet example.com détecté: ${tabId}`);
        } else {
          exampleTabs.delete(tabId);
        }
      }
    });
    chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
      if (exampleTabs.has(tabId)) {
        console.log(`Onglet example.com fermé: ${tabId}`);
        try {
          await chrome.notifications.create({
            type: "basic",
            iconUrl: "/icons/128.png",
            title: "Stupidos aves s",
            message: "Bravo ! Tu viens de perdre ton temps sur un site inutile 🎉				Félicitations ! Tu as réussi à gaspiller quelques minutes précieuses 👏				Mission accomplie : temps perdu avec succès ⏰				Wow ! Quel usage productif de ton temps libre ! 😂				Tu peux être fier(e) : tu viens de visiter le site le plus inutile du web 🏆				Bravo Einstein ! Tu as découvert la futilité incarnée 🧠				Temps bien investi ! (Non, je rigole) 🤡"
          });
        } catch (error) {
          console.error("Erreur notification:", error);
        }
        exampleTabs.delete(tabId);
      }
    });
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        var _a2;
        if (((_a2 = tab.url) == null ? void 0 : _a2.startsWith("https://example.com")) && tab.id) {
          exampleTabs.add(tab.id);
        }
      });
    });
  });
  background;
  function initPlugins() {
  }
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "http://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3eHQtZGV2K2Jyb3dzZXJAMC4wLjMyNi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL3d4dEAwLjIwLjdfQHR5cGVzK25vZGVAMjQuMS4wX2ppdGlAMi41LjFfcm9sbHVwQDQuNDUuMS9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvLnBucG0vd3h0QDAuMjAuN19AdHlwZXMrbm9kZUAyNC4xLjBfaml0aUAyLjUuMV9yb2xsdXBANC40NS4xL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtYmFja2dyb3VuZC5tanMiLCIuLi8uLi9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0B3ZWJleHQtY29yZSttYXRjaC1wYXR0ZXJuc0AxLjAuMy9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCJhc3luYyBmdW5jdGlvbiByZWxvYWRBbGxUYWJzKCkge1xuXHR0cnkge1xuXHRcdGNvbnN0IHRhYnMgPSBhd2FpdCBicm93c2VyLnRhYnMucXVlcnkoe30pO1xuXG5cdFx0Y29uc3QgcmVsb2FkUHJvbWlzZXMgPSB0YWJzXG5cdFx0XHQuZmlsdGVyKFxuXHRcdFx0XHQodGFiKSA9PlxuXHRcdFx0XHRcdHRhYi51cmwgJiZcblx0XHRcdFx0XHQodGFiLnVybC5zdGFydHNXaXRoKFwiaHR0cDovL1wiKSB8fCB0YWIudXJsLnN0YXJ0c1dpdGgoXCJodHRwczovL1wiKSlcblx0XHRcdClcblx0XHRcdC5tYXAoYXN5bmMgKHRhYikgPT4ge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGF3YWl0IGJyb3dzZXIudGFicy5yZWxvYWQodGFiPy5pZCEpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGDinJMgUmVjaGFyZ8OpOiAke3RhYi51cmx9YCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKGDinJcgw4ljaGVjIHJlY2hhcmdlbWVudCBvbmdsZXQgJHt0YWIuaWR9OmAsIGVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRhd2FpdCBQcm9taXNlLmFsbChyZWxvYWRQcm9taXNlcyk7XG5cdFx0Y29uc29sZS5sb2coXCJUb3VzIGxlcyBvbmdsZXRzIG9udCDDqXTDqSB0cmFpdMOpc1wiKTtcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRjb25zb2xlLmVycm9yKFwiRXJyZXVyIGxvcnMgZHUgcmVjaGFyZ2VtZW50OlwiLCBlcnJvcik7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZCgoKSA9PiB7XG5cdGxldCB0YWJTaHVmZmxlSW50ZXJ2YWw6IE5vZGVKUy5UaW1lb3V0IHwgbnVsbCA9IG51bGw7XG5cdGxldCBleGFtcGxlVGFic1dpdGhNb3VzZU91dCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuXG5cdC8vIFNlIGTDqWNsZW5jaGUgw6AgbCdpbnN0YWxsYXRpb24gRVQgw6AgbCdhY3RpdmF0aW9uXG5cdGJyb3dzZXIucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcihhc3luYyAoZGV0YWlscykgPT4ge1xuXHRcdGNvbnNvbGUubG9nKFwiRXh0ZW5zaW9uIGluc3RhbGzDqWUvYWN0aXbDqWU6XCIsIGRldGFpbHMucmVhc29uKTtcblxuXHRcdC8vIFJlY2hhcmdlciB0b3VzIGxlcyBvbmdsZXRzIGltbcOpZGlhdGVtZW50XG5cdFx0YXdhaXQgcmVsb2FkQWxsVGFicygpO1xuXHR9KTtcblxuXHQvLyBTZSBkw6ljbGVuY2hlIGF1c3NpIGF1IGTDqW1hcnJhZ2UgZHUgbmF2aWdhdGV1clxuXHRicm93c2VyLnJ1bnRpbWUub25TdGFydHVwLmFkZExpc3RlbmVyKGFzeW5jICgpID0+IHtcblx0XHRjb25zb2xlLmxvZyhcIkV4dGVuc2lvbiBkw6ltYXJyw6llXCIpO1xuXHRcdGF3YWl0IHJlbG9hZEFsbFRhYnMoKTtcblx0fSk7XG5cblx0Ly8gRm9uY3Rpb25uYWxpdMOpIDIgOiBEw6lzb3JkcmUgZGVzIG9uZ2xldHNcblx0Y2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIpID0+IHtcblx0XHRpZiAobWVzc2FnZS50eXBlID09PSBcIk1PVVNFX09VVFNJREVcIiAmJiBzZW5kZXIudGFiPy5pZCkge1xuXHRcdFx0Y29uc3QgdGFiSWQgPSBzZW5kZXIudGFiLmlkO1xuXG5cdFx0XHRpZiAobWVzc2FnZS5pc091dHNpZGUpIHtcblx0XHRcdFx0ZXhhbXBsZVRhYnNXaXRoTW91c2VPdXQuYWRkKHRhYklkKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGV4YW1wbGVUYWJzV2l0aE1vdXNlT3V0LmRlbGV0ZSh0YWJJZCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIETDqW1hcnJlciBsZSBtw6lsYW5nZSBzaSBhdSBtb2lucyB1biBvbmdsZXQgZXhhbXBsZS5jb20gYSBsYSBzb3VyaXMgw6AgbCdleHTDqXJpZXVyXG5cdFx0XHRpZiAoZXhhbXBsZVRhYnNXaXRoTW91c2VPdXQuc2l6ZSA+IDAgJiYgIXRhYlNodWZmbGVJbnRlcnZhbCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkTDqW1hcnJhZ2UgZHUgbcOpbGFuZ2UgZGVzIG9uZ2xldHNcIik7XG5cdFx0XHRcdHRhYlNodWZmbGVJbnRlcnZhbCA9IHNldEludGVydmFsKGFzeW5jICgpID0+IHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0Y29uc3QgdGFicyA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgY3VycmVudFdpbmRvdzogdHJ1ZSB9KTtcblxuXHRcdFx0XHRcdFx0aWYgKHRhYnMubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRcdFx0XHQvLyBDcsOpZXIgdW4gdGFibGVhdSBkJ2luZGljZXMgZXQgbGUgbcOpbGFuZ2VyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGluZGljZXMgPSB0YWJzLm1hcCgoXywgaW5kZXgpID0+IGluZGV4KTtcblx0XHRcdFx0XHRcdFx0Zm9yIChsZXQgaSA9IGluZGljZXMubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKTtcblx0XHRcdFx0XHRcdFx0XHRbaW5kaWNlc1tpXSwgaW5kaWNlc1tqXV0gPSBbaW5kaWNlc1tqXSwgaW5kaWNlc1tpXV07XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBEw6lwbGFjZXIgbGVzIG9uZ2xldHMgc2Vsb24gbGUgbm91dmVsIG9yZHJlXG5cdFx0XHRcdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGFicy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0YWJzW2ldLmlkICYmIGluZGljZXNbaV0gIT09IGkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGF3YWl0IGNocm9tZS50YWJzLm1vdmUodGFic1tpXT8uaWQhLCB7IGluZGV4OiBpbmRpY2VzW2ldIH0pO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQvLyBJbmplY3RlciBsZSBub3V2ZWF1IHRpdHJlIGRhbnMgY2hhcXVlIHRhYlxuXHRcdFx0XHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhYnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGFic1tpXS5pZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0YXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0OiB7IHRhYklkOiB0YWJzW2ldPy5pZCEgfSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnVuYzogKG5ld1RpdGxlOiBzdHJpbmcpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkb2N1bWVudC50aXRsZSA9IG5ld1RpdGxlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRhcmdzOiBbXCJleGFtcGxlLmNvbVwiXSxcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyZXVyIGxvcnMgZHUgbcOpbGFuZ2UgZGVzIG9uZ2xldHM6XCIsIGVycm9yKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sIDEwMCk7XG5cdFx0XHR9IGVsc2UgaWYgKGV4YW1wbGVUYWJzV2l0aE1vdXNlT3V0LnNpemUgPT09IDAgJiYgdGFiU2h1ZmZsZUludGVydmFsKSB7XG5cdFx0XHRcdC8vIEFycsOqdGVyIGxlIG3DqWxhbmdlIHNpIGF1Y3VuIG9uZ2xldCBleGFtcGxlLmNvbSBuJ2EgbGEgc291cmlzIMOgIGwnZXh0w6lyaWV1clxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIkFycsOqdCBkdSBtw6lsYW5nZSBkZXMgb25nbGV0c1wiKTtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbCh0YWJTaHVmZmxlSW50ZXJ2YWwpO1xuXHRcdFx0XHR0YWJTaHVmZmxlSW50ZXJ2YWwgPSBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0Ly8gTmV0dG95ZXIgcXVhbmQgdW4gb25nbGV0IGVzdCBmZXJtw6lcblx0Y2hyb21lLnRhYnMub25SZW1vdmVkLmFkZExpc3RlbmVyKCh0YWJJZCkgPT4ge1xuXHRcdGV4YW1wbGVUYWJzV2l0aE1vdXNlT3V0LmRlbGV0ZSh0YWJJZCk7XG5cdFx0aWYgKGV4YW1wbGVUYWJzV2l0aE1vdXNlT3V0LnNpemUgPT09IDAgJiYgdGFiU2h1ZmZsZUludGVydmFsKSB7XG5cdFx0XHRjbGVhckludGVydmFsKHRhYlNodWZmbGVJbnRlcnZhbCk7XG5cdFx0XHR0YWJTaHVmZmxlSW50ZXJ2YWwgPSBudWxsO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gRm9uY3Rpb25uYWxpdMOpIDMgOiBOb3RpZmljYXRpb24gw6AgbGEgZmVybWV0dXJlXG5cdC8vIFN0b2NrZXIgbGVzIG9uZ2xldHMgZXhhbXBsZS5jb21cblx0Y29uc3QgZXhhbXBsZVRhYnMgPSBuZXcgU2V0PG51bWJlcj4oKTtcblxuXHRjaHJvbWUudGFicy5vblVwZGF0ZWQuYWRkTGlzdGVuZXIoKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpID0+IHtcblx0XHRpZiAoY2hhbmdlSW5mby5zdGF0dXMgPT09IFwiY29tcGxldGVcIiAmJiB0YWIudXJsKSB7XG5cdFx0XHRpZiAodGFiLnVybC5zdGFydHNXaXRoKFwiaHR0cHM6Ly9leGFtcGxlLmNvbVwiKSkge1xuXHRcdFx0XHRleGFtcGxlVGFicy5hZGQodGFiSWQpO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgT25nbGV0IGV4YW1wbGUuY29tIGTDqXRlY3TDqTogJHt0YWJJZH1gKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGV4YW1wbGVUYWJzLmRlbGV0ZSh0YWJJZCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHRjaHJvbWUudGFicy5vblJlbW92ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYklkLCByZW1vdmVJbmZvKSA9PiB7XG5cdFx0aWYgKGV4YW1wbGVUYWJzLmhhcyh0YWJJZCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKGBPbmdsZXQgZXhhbXBsZS5jb20gZmVybcOpOiAke3RhYklkfWApO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0YXdhaXQgY2hyb21lLm5vdGlmaWNhdGlvbnMuY3JlYXRlKHtcblx0XHRcdFx0XHR0eXBlOiBcImJhc2ljXCIsXG5cdFx0XHRcdFx0aWNvblVybDogXCIvaWNvbnMvMTI4LnBuZ1wiLFxuXHRcdFx0XHRcdHRpdGxlOiBcIlN0dXBpZG9zIGF2ZXMgc1wiLFxuXHRcdFx0XHRcdG1lc3NhZ2U6XG5cdFx0XHRcdFx0XHRcIkJyYXZvICEgVHUgdmllbnMgZGUgcGVyZHJlIHRvbiB0ZW1wcyBzdXIgdW4gc2l0ZSBpbnV0aWxlIPCfjolcXFxuXHRcdFx0XHRGw6lsaWNpdGF0aW9ucyAhIFR1IGFzIHLDqXVzc2kgw6AgZ2FzcGlsbGVyIHF1ZWxxdWVzIG1pbnV0ZXMgcHLDqWNpZXVzZXMg8J+Rj1xcXG5cdFx0XHRcdE1pc3Npb24gYWNjb21wbGllIDogdGVtcHMgcGVyZHUgYXZlYyBzdWNjw6hzIOKPsFxcXG5cdFx0XHRcdFdvdyAhIFF1ZWwgdXNhZ2UgcHJvZHVjdGlmIGRlIHRvbiB0ZW1wcyBsaWJyZSAhIPCfmIJcXFxuXHRcdFx0XHRUdSBwZXV4IMOqdHJlIGZpZXIoZSkgOiB0dSB2aWVucyBkZSB2aXNpdGVyIGxlIHNpdGUgbGUgcGx1cyBpbnV0aWxlIGR1IHdlYiDwn4+GXFxcblx0XHRcdFx0QnJhdm8gRWluc3RlaW4gISBUdSBhcyBkw6ljb3V2ZXJ0IGxhIGZ1dGlsaXTDqSBpbmNhcm7DqWUg8J+noFxcXG5cdFx0XHRcdFRlbXBzIGJpZW4gaW52ZXN0aSAhIChOb24sIGplIHJpZ29sZSkg8J+koVwiLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJldXIgbm90aWZpY2F0aW9uOlwiLCBlcnJvcik7XG5cdFx0XHR9XG5cdFx0XHRleGFtcGxlVGFicy5kZWxldGUodGFiSWQpO1xuXHRcdH1cblx0fSk7XG5cblx0Ly8gSW5pdGlhbGlzZXIgbGVzIG9uZ2xldHMgZXhpc3RhbnRzIGF1IGTDqW1hcnJhZ2Vcblx0Y2hyb21lLnRhYnMucXVlcnkoe30sICh0YWJzKSA9PiB7XG5cdFx0dGFicy5mb3JFYWNoKCh0YWIpID0+IHtcblx0XHRcdGlmICh0YWIudXJsPy5zdGFydHNXaXRoKFwiaHR0cHM6Ly9leGFtcGxlLmNvbVwiKSAmJiB0YWIuaWQpIHtcblx0XHRcdFx0ZXhhbXBsZVRhYnMuYWRkKHRhYi5pZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xufSk7XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbImJyb3dzZXIiLCJfYnJvd3NlciIsIl9hIiwiX2IiXSwibWFwcGluZ3MiOiI7OztBQUNPLFFBQU1BLGNBQVUsc0JBQVcsWUFBWCxtQkFBb0IsWUFBcEIsbUJBQTZCLE1BQ2hELFdBQVcsVUFDWCxXQUFXO0FDRlIsUUFBTSxVQUFVQztBQ0RoQixXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUc7QUFDaEUsV0FBTztBQUFBLEVBQ1Q7QUNIQSxpQkFBQSxnQkFBQTtBQUNDLFFBQUE7QUFDQyxZQUFBLE9BQUEsTUFBQSxRQUFBLEtBQUEsTUFBQSxDQUFBLENBQUE7QUFFQSxZQUFBLGlCQUFBLEtBQUE7QUFBQSxRQUNFLENBQUEsUUFBQSxJQUFBLFFBQUEsSUFBQSxJQUFBLFdBQUEsU0FBQSxLQUFBLElBQUEsSUFBQSxXQUFBLFVBQUE7QUFBQSxNQUdnRSxFQUFBLElBQUEsT0FBQSxRQUFBO0FBR2hFLFlBQUE7QUFDQyxnQkFBQSxRQUFBLEtBQUEsT0FBQSwyQkFBQSxFQUFBO0FBQ0Esa0JBQUEsSUFBQSxlQUFBLElBQUEsR0FBQSxFQUFBO0FBQUEsUUFBb0MsU0FBQSxPQUFBO0FBRXBDLGtCQUFBLEtBQUEsK0JBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQTtBQUFBLFFBQTREO0FBQUEsTUFDN0QsQ0FBQTtBQUdGLFlBQUEsUUFBQSxJQUFBLGNBQUE7QUFDQSxjQUFBLElBQUEsa0NBQUE7QUFBQSxJQUE4QyxTQUFBLE9BQUE7QUFFOUMsY0FBQSxNQUFBLGdDQUFBLEtBQUE7QUFBQSxJQUFtRDtBQUFBLEVBRXJEO0FBRUEsUUFBQSxhQUFBLGlCQUFBLE1BQUE7QUFDQyxRQUFBLHFCQUFBO0FBQ0EsUUFBQSwwQkFBQSxvQkFBQSxJQUFBO0FBR0EsWUFBQSxRQUFBLFlBQUEsWUFBQSxPQUFBLFlBQUE7QUFDQyxjQUFBLElBQUEsZ0NBQUEsUUFBQSxNQUFBO0FBR0EsWUFBQSxjQUFBO0FBQUEsSUFBb0IsQ0FBQTtBQUlyQixZQUFBLFFBQUEsVUFBQSxZQUFBLFlBQUE7QUFDQyxjQUFBLElBQUEsb0JBQUE7QUFDQSxZQUFBLGNBQUE7QUFBQSxJQUFvQixDQUFBO0FBSXJCLFdBQUEsUUFBQSxVQUFBLFlBQUEsQ0FBQSxTQUFBLFdBQUE7O0FBQ0MsVUFBQSxRQUFBLFNBQUEscUJBQUFDLE1BQUEsT0FBQSxRQUFBLGdCQUFBQSxJQUFBLEtBQUE7QUFDQyxjQUFBLFFBQUEsT0FBQSxJQUFBO0FBRUEsWUFBQSxRQUFBLFdBQUE7QUFDQyxrQ0FBQSxJQUFBLEtBQUE7QUFBQSxRQUFpQyxPQUFBO0FBRWpDLGtDQUFBLE9BQUEsS0FBQTtBQUFBLFFBQW9DO0FBSXJDLFlBQUEsd0JBQUEsT0FBQSxLQUFBLENBQUEsb0JBQUE7QUFDQyxrQkFBQSxJQUFBLGtDQUFBO0FBQ0EsK0JBQUEsWUFBQSxZQUFBOztBQUNDLGdCQUFBO0FBQ0Msb0JBQUEsT0FBQSxNQUFBLE9BQUEsS0FBQSxNQUFBLEVBQUEsZUFBQSxNQUFBO0FBRUEsa0JBQUEsS0FBQSxTQUFBLEdBQUE7QUFFQyxzQkFBQSxVQUFBLEtBQUEsSUFBQSxDQUFBLEdBQUEsVUFBQSxLQUFBO0FBQ0EseUJBQUEsSUFBQSxRQUFBLFNBQUEsR0FBQSxJQUFBLEdBQUEsS0FBQTtBQUNDLHdCQUFBLElBQUEsS0FBQSxNQUFBLEtBQUEsWUFBQSxJQUFBLEVBQUE7QUFDQSxtQkFBQSxRQUFBLENBQUEsR0FBQSxRQUFBLENBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsUUFBQSxDQUFBLENBQUE7QUFBQSxnQkFBa0Q7QUFJbkQseUJBQUEsSUFBQSxHQUFBLElBQUEsS0FBQSxRQUFBLEtBQUE7QUFDQyxzQkFBQSxLQUFBLENBQUEsRUFBQSxNQUFBLFFBQUEsQ0FBQSxNQUFBLEdBQUE7QUFDQywwQkFBQSxPQUFBLEtBQUEsTUFBQUEsTUFBQSxLQUFBLENBQUEsTUFBQSxnQkFBQUEsSUFBQSxJQUFBLEVBQUEsT0FBQSxRQUFBLENBQUEsRUFBQSxDQUFBO0FBQUEsa0JBQTBEO0FBQUEsZ0JBQzNEO0FBR0QseUJBQUEsSUFBQSxHQUFBLElBQUEsS0FBQSxRQUFBLEtBQUE7QUFDQyxzQkFBQSxLQUFBLENBQUEsRUFBQSxJQUFBO0FBQ0MsMEJBQUEsT0FBQSxVQUFBLGNBQUE7QUFBQSxzQkFBcUMsUUFBQSxFQUFBLFFBQUFDLE1BQUEsS0FBQSxDQUFBLE1BQUEsZ0JBQUFBLElBQUEsR0FBQTtBQUFBLHNCQUNOLE1BQUEsQ0FBQSxhQUFBO0FBRTdCLGlDQUFBLFFBQUE7QUFBQSxzQkFBaUI7QUFBQSxzQkFDbEIsTUFBQSxDQUFBLGFBQUE7QUFBQSxvQkFDb0IsQ0FBQTtBQUFBLGtCQUNwQjtBQUFBLGdCQUNGO0FBQUEsY0FDRDtBQUFBLFlBQ0QsU0FBQSxPQUFBO0FBRUEsc0JBQUEsTUFBQSx1Q0FBQSxLQUFBO0FBQUEsWUFBMEQ7QUFBQSxVQUMzRCxHQUFBLEdBQUE7QUFBQSxRQUNLLFdBQUEsd0JBQUEsU0FBQSxLQUFBLG9CQUFBO0FBR04sa0JBQUEsSUFBQSw4QkFBQTtBQUNBLHdCQUFBLGtCQUFBO0FBQ0EsK0JBQUE7QUFBQSxRQUFxQjtBQUFBLE1BQ3RCO0FBQUEsSUFDRCxDQUFBO0FBSUQsV0FBQSxLQUFBLFVBQUEsWUFBQSxDQUFBLFVBQUE7QUFDQyw4QkFBQSxPQUFBLEtBQUE7QUFDQSxVQUFBLHdCQUFBLFNBQUEsS0FBQSxvQkFBQTtBQUNDLHNCQUFBLGtCQUFBO0FBQ0EsNkJBQUE7QUFBQSxNQUFxQjtBQUFBLElBQ3RCLENBQUE7QUFLRCxVQUFBLGNBQUEsb0JBQUEsSUFBQTtBQUVBLFdBQUEsS0FBQSxVQUFBLFlBQUEsQ0FBQSxPQUFBLFlBQUEsUUFBQTtBQUNDLFVBQUEsV0FBQSxXQUFBLGNBQUEsSUFBQSxLQUFBO0FBQ0MsWUFBQSxJQUFBLElBQUEsV0FBQSxxQkFBQSxHQUFBO0FBQ0Msc0JBQUEsSUFBQSxLQUFBO0FBQ0Esa0JBQUEsSUFBQSwrQkFBQSxLQUFBLEVBQUE7QUFBQSxRQUFrRCxPQUFBO0FBRWxELHNCQUFBLE9BQUEsS0FBQTtBQUFBLFFBQXdCO0FBQUEsTUFDekI7QUFBQSxJQUNELENBQUE7QUFHRCxXQUFBLEtBQUEsVUFBQSxZQUFBLE9BQUEsT0FBQSxlQUFBO0FBQ0MsVUFBQSxZQUFBLElBQUEsS0FBQSxHQUFBO0FBQ0MsZ0JBQUEsSUFBQSw2QkFBQSxLQUFBLEVBQUE7QUFDQSxZQUFBO0FBQ0MsZ0JBQUEsT0FBQSxjQUFBLE9BQUE7QUFBQSxZQUFrQyxNQUFBO0FBQUEsWUFDM0IsU0FBQTtBQUFBLFlBQ0csT0FBQTtBQUFBLFlBQ0YsU0FBQTtBQUFBLFVBRU4sQ0FBQTtBQUFBLFFBT0QsU0FBQSxPQUFBO0FBRUQsa0JBQUEsTUFBQSx3QkFBQSxLQUFBO0FBQUEsUUFBMkM7QUFFNUMsb0JBQUEsT0FBQSxLQUFBO0FBQUEsTUFBd0I7QUFBQSxJQUN6QixDQUFBO0FBSUQsV0FBQSxLQUFBLE1BQUEsQ0FBQSxHQUFBLENBQUEsU0FBQTtBQUNDLFdBQUEsUUFBQSxDQUFBLFFBQUE7O0FBQ0MsY0FBQUQsTUFBQSxJQUFBLFFBQUEsZ0JBQUFBLElBQUEsV0FBQSwyQkFBQSxJQUFBLElBQUE7QUFDQyxzQkFBQSxJQUFBLElBQUEsRUFBQTtBQUFBLFFBQXNCO0FBQUEsTUFDdkIsQ0FBQTtBQUFBLElBQ0EsQ0FBQTtBQUFBLEVBRUgsQ0FBQTs7OztBQzdKQSxNQUFJLGdCQUFnQixNQUFNO0FBQUEsSUFDeEIsWUFBWSxjQUFjO0FBQ3hCLFVBQUksaUJBQWlCLGNBQWM7QUFDakMsYUFBSyxZQUFZO0FBQ2pCLGFBQUssa0JBQWtCLENBQUMsR0FBRyxjQUFjLFNBQVM7QUFDbEQsYUFBSyxnQkFBZ0I7QUFDckIsYUFBSyxnQkFBZ0I7QUFBQSxNQUN2QixPQUFPO0FBQ0wsY0FBTSxTQUFTLHVCQUF1QixLQUFLLFlBQVk7QUFDdkQsWUFBSSxVQUFVO0FBQ1osZ0JBQU0sSUFBSSxvQkFBb0IsY0FBYyxrQkFBa0I7QUFDaEUsY0FBTSxDQUFDLEdBQUcsVUFBVSxVQUFVLFFBQVEsSUFBSTtBQUMxQyx5QkFBaUIsY0FBYyxRQUFRO0FBQ3ZDLHlCQUFpQixjQUFjLFFBQVE7QUFFdkMsYUFBSyxrQkFBa0IsYUFBYSxNQUFNLENBQUMsUUFBUSxPQUFPLElBQUksQ0FBQyxRQUFRO0FBQ3ZFLGFBQUssZ0JBQWdCO0FBQ3JCLGFBQUssZ0JBQWdCO0FBQUEsTUFDdkI7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLEtBQUs7QUFDWixVQUFJLEtBQUs7QUFDUCxlQUFPO0FBQ1QsWUFBTSxJQUFJLE9BQU8sUUFBUSxXQUFXLElBQUksSUFBSSxHQUFHLElBQUksZUFBZSxXQUFXLElBQUksSUFBSSxJQUFJLElBQUksSUFBSTtBQUNqRyxhQUFPLENBQUMsQ0FBQyxLQUFLLGdCQUFnQixLQUFLLENBQUMsYUFBYTtBQUMvQyxZQUFJLGFBQWE7QUFDZixpQkFBTyxLQUFLLFlBQVksQ0FBQztBQUMzQixZQUFJLGFBQWE7QUFDZixpQkFBTyxLQUFLLGFBQWEsQ0FBQztBQUM1QixZQUFJLGFBQWE7QUFDZixpQkFBTyxLQUFLLFlBQVksQ0FBQztBQUMzQixZQUFJLGFBQWE7QUFDZixpQkFBTyxLQUFLLFdBQVcsQ0FBQztBQUMxQixZQUFJLGFBQWE7QUFDZixpQkFBTyxLQUFLLFdBQVcsQ0FBQztBQUFBLE1BQzVCLENBQUM7QUFBQSxJQUNIO0FBQUEsSUFDQSxZQUFZLEtBQUs7QUFDZixhQUFPLElBQUksYUFBYSxXQUFXLEtBQUssZ0JBQWdCLEdBQUc7QUFBQSxJQUM3RDtBQUFBLElBQ0EsYUFBYSxLQUFLO0FBQ2hCLGFBQU8sSUFBSSxhQUFhLFlBQVksS0FBSyxnQkFBZ0IsR0FBRztBQUFBLElBQzlEO0FBQUEsSUFDQSxnQkFBZ0IsS0FBSztBQUNuQixVQUFJLENBQUMsS0FBSyxpQkFBaUIsQ0FBQyxLQUFLO0FBQy9CLGVBQU87QUFDVCxZQUFNLHNCQUFzQjtBQUFBLFFBQzFCLEtBQUssc0JBQXNCLEtBQUssYUFBYTtBQUFBLFFBQzdDLEtBQUssc0JBQXNCLEtBQUssY0FBYyxRQUFRLFNBQVMsRUFBRSxDQUFDO0FBQUEsTUFDeEU7QUFDSSxZQUFNLHFCQUFxQixLQUFLLHNCQUFzQixLQUFLLGFBQWE7QUFDeEUsYUFBTyxDQUFDLENBQUMsb0JBQW9CLEtBQUssQ0FBQyxVQUFVLE1BQU0sS0FBSyxJQUFJLFFBQVEsQ0FBQyxLQUFLLG1CQUFtQixLQUFLLElBQUksUUFBUTtBQUFBLElBQ2hIO0FBQUEsSUFDQSxZQUFZLEtBQUs7QUFDZixZQUFNLE1BQU0scUVBQXFFO0FBQUEsSUFDbkY7QUFBQSxJQUNBLFdBQVcsS0FBSztBQUNkLFlBQU0sTUFBTSxvRUFBb0U7QUFBQSxJQUNsRjtBQUFBLElBQ0EsV0FBVyxLQUFLO0FBQ2QsWUFBTSxNQUFNLG9FQUFvRTtBQUFBLElBQ2xGO0FBQUEsSUFDQSxzQkFBc0IsU0FBUztBQUM3QixZQUFNLFVBQVUsS0FBSyxlQUFlLE9BQU87QUFDM0MsWUFBTSxnQkFBZ0IsUUFBUSxRQUFRLFNBQVMsSUFBSTtBQUNuRCxhQUFPLE9BQU8sSUFBSSxhQUFhLEdBQUc7QUFBQSxJQUNwQztBQUFBLElBQ0EsZUFBZSxRQUFRO0FBQ3JCLGFBQU8sT0FBTyxRQUFRLHVCQUF1QixNQUFNO0FBQUEsSUFDckQ7QUFBQSxFQUNGO0FBQ0EsTUFBSSxlQUFlO0FBQ25CLGVBQWEsWUFBWSxDQUFDLFFBQVEsU0FBUyxRQUFRLE9BQU8sS0FBSztBQUMvRCxNQUFJLHNCQUFzQixjQUFjLE1BQU07QUFBQSxJQUM1QyxZQUFZLGNBQWMsUUFBUTtBQUNoQyxZQUFNLDBCQUEwQixZQUFZLE1BQU0sTUFBTSxFQUFFO0FBQUEsSUFDNUQ7QUFBQSxFQUNGO0FBQ0EsV0FBUyxpQkFBaUIsY0FBYyxVQUFVO0FBQ2hELFFBQUksQ0FBQyxhQUFhLFVBQVUsU0FBUyxRQUFRLEtBQUssYUFBYTtBQUM3RCxZQUFNLElBQUk7QUFBQSxRQUNSO0FBQUEsUUFDQSxHQUFHLFFBQVEsMEJBQTBCLGFBQWEsVUFBVSxLQUFLLElBQUksQ0FBQztBQUFBLE1BQzVFO0FBQUEsRUFDQTtBQUNBLFdBQVMsaUJBQWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLFNBQVMsU0FBUyxHQUFHO0FBQ3ZCLFlBQU0sSUFBSSxvQkFBb0IsY0FBYyxnQ0FBZ0M7QUFDOUUsUUFBSSxTQUFTLFNBQVMsR0FBRyxLQUFLLFNBQVMsU0FBUyxLQUFLLENBQUMsU0FBUyxXQUFXLElBQUk7QUFDNUUsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0E7QUFBQSxNQUNOO0FBQUEsRUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsNF19
