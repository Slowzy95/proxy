import { getFavicon, rAlert } from "./utils.mjs";
import { getUV, search, rotateWisp, currentWispIndex } from "./prxy.mjs";

const { span, iframe, button, img } = van.tags;
const {
  tags: { "ion-icon": ionIcon },
} = van;

var tabs = [];
var selectedTab = null;

// Side bar
const sideBar = document.querySelector("header");

// Controls
const pageBack = document.getElementById("page-back");
const pageForward = document.getElementById("page-forward");
const pageRefresh = document.getElementById("page-refresh");

// URL Bar
const urlForm = document.getElementById("url-form");
const urlInput = document.getElementById("url-input");

// New Tab Button
const newTabButton = document.getElementById("new-tab");

// Tab List
const tabList = document.getElementById("tab-list");

// Tab View
const tabView = document.getElementById("tab-view");

// Event Listeners
window.onmousemove = (e) => {
  if (e.clientX < 50) {
    sideBar.classList.add("hovered");
  } else {
    sideBar.classList.remove("hovered");
  }
};
pageBack.onclick = () => {
  selectedTab.view.contentWindow.history.back();
};

pageForward.onclick = () => {
  selectedTab.view.contentWindow.history.forward();
};

pageRefresh.onclick = () => {
  selectedTab.view.contentWindow.location.reload();
};

newTabButton.onclick = () => {
  addTab("about:newtab");
};

// Barre latérale : bouton pour la masquer/réduire (logo V2, onglets)
const sidebarToggle = document.getElementById("sidebar-toggle");
function setSidebar(open) {
  sideBar.classList.toggle("closed", !open);
  tabView.classList.toggle("full-width", !open);
  document.body.classList.toggle("sidebar-off", !open);
  localStorage.setItem("uv-sidebar", open ? "1" : "0");
}
if (sidebarToggle)
  sidebarToggle.onclick = () => setSidebar(sideBar.classList.contains("closed"));

// Options (opt menu)
const devtoolsOption = document.getElementById("devtools-option");
const abcOption = document.getElementById("abc-option");
const gitOption = document.getElementById("git-option");

devtoolsOption.onclick = () => {
  try {
    // Assuming `selectedTab.view.contentWindow` is your target window
    selectedTab.view.contentWindow.eval(eruda);
    rAlert("Injected successfully.<br>Click the icon on the bottom right.");
  } catch (error) {
    rAlert("Failed to inject.");
  }
};

abcOption.onclick = () => {
  abCloak(selectedTab.view.src);
  rAlert("Opened in about:blank");
};

gitOption.onclick = () => {
  window.open("https://github.com/rhenryw/UV-Static-2.0", "_blank");
};

urlForm.onsubmit = async (e) => {
  e.preventDefault();
  renavTab(selectedTab, urlInput.value);
};

let eruda = `fetch("https://cdn.jsdelivr.net/npm/eruda")
.then((res) => res.text())
.then((data) => {
  eval(data);
  if (!window.erudaLoaded) {
    eruda.init({ defaults: { displaySize: 45, theme: "AMOLED" } });
    window.erudaLoaded = true;
  }
});`;

function abCloak(cloakUrl) {
  var win = window.open();
  var iframe = win.document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0px";
  iframe.style.left = "0px";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.src = cloakUrl;
  win.document.body.appendChild(iframe);
}

// Objects
const tabItem = (tab) => {
  return button(
    {
      onclick: (e) => {
        if (
          !e.target.classList.contains("close") &&
          !e.target.classList.contains("close-icon")
        ) {
          focusTab(tab);
        }
      },
      class: "tab-item hover-focus1",
    },
    img({ src: getFavicon(tab.url) }),
    span(tab.title),

    button(
      {
        onclick: () => {
          tabs.splice(tabs.indexOf(tab), 1);

          if (tab == selectedTab) {
            selectedTab = null;
            if (tabs.length) focusTab(tabs[tabs.length - 1]);
            else
              setTimeout(() => {
                addTab("about:newtab");
              }, 100);
          }

          tabView.removeChild(tab.view);
          tab.view.remove();

          localStorage.setItem(
            "tabs",
            JSON.stringify(
              tabs.map((tab) => {
                return tab.url;
              })
            )
          );

          tab.item.style.animation = "slide-out-from-bottom 0.1s ease";
          setTimeout(() => {
            tabList.removeChild(tab.item);
            tab.item.remove();
          }, 75);
        },
        class: "close",
      },
      ionIcon({ name: "close", class: "close-icon" })
    )
  );
};

const tabFrame = (tab) => {
  return iframe({
    class: "tab-frame",
    sandbox:
      "allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-downloads",
    src: tab.proxiedUrl,
    onload: (e) => {
      // Nouvelle tentative automatique si la page d'erreur du proxy s'affiche
      try {
        const doc = e.target.contentDocument;
        const isErr =
          doc &&
          (doc.title === "Error" ||
            (doc.body &&
              doc.body.textContent.includes("Error processing your request")) ||
            /* Page vide (blanche) : le serveur wisp n'a pas répondu — on
               réessaie comme pour une erreur, sinon le site semble charger
               à l'infini */
            (!doc.title && doc.body && doc.body.innerHTML.trim() === ""));
        if (isErr) {
          tab._tries = (tab._tries || 0) + 1;
          if (tab._tries <= 3) {
            setTimeout(() => {
              // Après 2 échecs, on change de serveur wisp et on réessaie
              if (tab._tries >= 2) rotateWisp();
              tab.view.src = tab.proxiedUrl;
            }, 1200);
            return;
          }
          /* Abandon après 3 essais : on prévient le WebOS (page parente) */
          try {
            if (window.parent !== window)
              parent.postMessage({ wosProxy: "error", url: tab.url }, "*");
          } catch (err) {}
        } else {
          tab._tries = 0;
          /* Signale au WebOS (page parente) que le chargement a réussi —
             cela arrête son minuteur de secours (rotation de serveur wisp) */
          try {
            if (window.parent !== window)
              parent.postMessage({ wosProxy: "loaded", url: tab.url }, "*");
          } catch (err) {}
        }
      } catch (err) {}

      /* Correctif « carrés blancs » : les srcset dont les URLs contiennent des
         virgules (Cloudflare Image — Poki, FrAnime…) sont mal réécrits par le
         client Ultraviolet → URLs tronquées → images en échec. Ce script
         recharge les images cassées avec leur URL complète (attribut src
         d'origine, intact). */
      try {
        const doc = e.target.contentDocument;
        if (
          doc &&
          doc.body &&
          tab.proxiedUrl.includes("/proxy/uv/service/") &&
          !doc.defaultView.__wosImgFix
        ) {
          const s = doc.createElement("script");
          s.textContent =
            '(function(){if(window.__wosImgFix)return;window.__wosImgFix=1;' +
            'function fix(img){try{var raw=img.getAttribute("src")||"";' +
            'if(!/^https?:\\/\\//.test(raw))return;' +
            'if(img.getAttribute("data-wos-fixed"))return;' +
            'img.setAttribute("data-wos-fixed","1");' +
            'if(img.getAttribute("srcset"))img.removeAttribute("srcset");' +
            'img.src=raw;}catch(e){}}' +
            'document.addEventListener("error",function(e){' +
            'if(e.target&&e.target.tagName==="IMG")fix(e.target);},true);' +
            'setInterval(function(){try{for(var i=0;i<document.images.length;i++){' +
            'var im=document.images[i];if(im.complete&&im.naturalWidth===0)fix(im);}}catch(e){}},2500);})();';
          (doc.head || doc.body).appendChild(s);
        }
      } catch (err) {}

      let parts = e.target.contentWindow.location.pathname.slice(1).split("/");
      /* Pages locales (nouvel onglet) : pas de décodage Ultraviolet */
      if (!tab.proxiedUrl.includes("/proxy/uv/service/")) {
        tab.title = (e.target.contentDocument && e.target.contentDocument.title) || "Nouvel onglet";
        tabList.children[tabs.indexOf(tab)].children[1].textContent = tab.title;
        tabList.children[tabs.indexOf(tab)].children[0].src = getFavicon("https://www.google.com");
        if (tab == selectedTab) urlInput.value = "";
        return;
      }
      let targetUrl = decodeURIComponent(
        __uv$config.decodeUrl(parts[parts.length - 1])
      );

      tab.title = tab.view.contentWindow.document.title;
      console.log(tab.title);
      tab.url = targetUrl;
      tabList.children[tabs.indexOf(tab)].children[1].textContent = tab.title;
      tabList.children[tabs.indexOf(tab)].children[0].src =
        getFavicon(targetUrl);

      // Update URL bar
      if (tab == selectedTab) {
        urlInput.value = targetUrl;
      }

      localStorage.setItem(
        "tabs",
        JSON.stringify(
          tabs.map((tab) => {
            return tab.url;
          })
        )
      );
    },
  });
};

function focusTab(tab) {
  if (selectedTab) {
    selectedTab.view.style.display = "none";
    tabList.children[tabs.indexOf(selectedTab)].classList.remove("selectedTab");
  }
  selectedTab = tab;
  tab.view.style.display = "block";

  // Update URL bar
  urlInput.value = tab.url;

  tabList.children[tabs.indexOf(tab)].classList.add("selectedTab");
}

/* Recharge un onglet existant vers une nouvelle URL, SANS laisser la page
   naviguer son propre cadre (ce qui fait planter le rendu Chromium à cause
   du service worker). Le site est rechargé proprement dans un cadre tout
   neuf — c'est ce qui fait marcher les clics sur les jeux (Poki, CrazyGames,
   jeux .io…) qui plantaient avant. */
/* Intercepte TOUS les clics sur les liens du site affiché (délégation
   globale) : empêcher la page de naviguer son propre cadre évite le
   plantage du rendu Chromium (bug avec le service worker). Le site est
   rechargé proprement dans un cadre neuf via renavTab — c'est ce qui fait
   marcher les clics sur les jeux (Poki, CrazyGames, .io…) qui plantaient. */
function attachLinkGuard(tab) {
  tab.view.addEventListener("load", () => {
    const fdoc = tab.view.contentDocument;
    if (!fdoc || fdoc.__wosLinkGuard) return;
    fdoc.__wosLinkGuard = true;
    fdoc.addEventListener(
      "click",
      (event) => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
        const a =
          event.target && event.target.closest ? event.target.closest("a") : null;
        if (!a) return;
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;
        event.preventDefault();
        event.stopPropagation();
        renavTab(tab, a.href);
      },
      true
    );
  });
}

async function renavTab(tab, link) {
  /* Charge une nouvelle URL SANS laisser la page naviguer son propre cadre
     (plantage du rendu Chromium avec le service worker) ET sans créer un
     cadre neuf dans le même processus que la page lourde précédente
     (manque de mémoire → crash au clic sur les jeux). Solution fiable :
     on relance une page proxy toute neuve — dans le Web OS via la fenêtre
     parente, en direct sinon. */
  try {
    const u = search(link);
    if (!/^https?:/.test(u)) return;
    const inWebOS =
      window.parent !== window && window.parent === window.parent.parent;
    if (inWebOS) {
      /* Dans le Web OS : on demande à la fenêtre parente de relancer la
         navigation — page proxy neuve, processus propre, le jeu charge. */
      parent.postMessage({ wosNav: u }, "*");
    } else {
      /* Proxy utilisé seul : on recharge la page proxy sur la nouvelle URL */
      const params = new URLSearchParams();
      params.set("url", u);
      if (new URLSearchParams(location.search).has("clean"))
        params.set("clean", "1");
      const w = currentWispIndex();
      if (w > 0) params.set("wisp", String(w));
      location.href = "/proxy/?" + params.toString();
    }
  } catch (err) {
    rAlert("Impossible de charger la page — réessaie");
  }
}

async function addTab(link) {
  let url;
  let tab = {};

  /* Serveur wisp forcé par le WebOS (?wisp=N) — si le serveur habituel est
     lent ou bloqué (site qui charge à l'infini), le WebOS relance le
     chargement en forçant un autre serveur, sans perdre de temps à
     re-sonder tous les serveurs. */
  const wispForce = (() => {
    const w = new URLSearchParams(location.search).get("wisp");
    const n = parseInt(w, 10);
    return Number.isInteger(n) && n >= 0 ? n : null;
  })();

  if (link === "about:newtab") {
    /* Page « nouvel onglet » locale : barre de recherche + raccourcis */
    tab.title = "Nouvel onglet";
    tab.url = "about:newtab";
    tab.proxiedUrl = "newtab.html";
  } else {
    try {
      url = await getUV(link, wispForce);
    } catch (err) {
      /* Échec du proxy (serveur wisp bloqué, SW bloqué…) : on prévient le
         WebOS (page parente) pour qu'il bascule de serveur et réessaie */
      try {
        if (window.parent !== window)
          parent.postMessage({ wosProxy: "error", url: link }, "*");
      } catch (e) {}
      throw err;
    }
    tab.title = decodeURIComponent(
      __uv$config.decodeUrl(url.substring(url.lastIndexOf("/") + 1))
    ).replace(/^https?:\/\//, "");
    tab.url = search(link);
    tab.proxiedUrl = url;
  }
  tab.icon = null;
  tab.view = tabFrame(tab);
  tab.item = tabItem(tab);
  attachLinkGuard(tab);

  tabs.push(tab);

  tabList.appendChild(tab.item);

  tabView.appendChild(tab.view);
  focusTab(tab);
}

addTab("about:newtab");

/* Permet à la page « nouvel onglet » (même origine) d'ouvrir des liens dans un onglet du proxy */
window.wosOpen = (u) => {
  addTab(u)
    .then(() => focusTab(tabs[tabs.length - 1]))
    .catch(() => {});
};

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has("inject") || urlParams.has("url")) {
  const target = urlParams.get("inject") || urlParams.get("url");

  setTimeout(() => {
    addTab(target)
      .then(() => focusTab(tabs[tabs.length - 1]))
      .catch(() => {});
  }, 100);
}

// Mode épuré : ?clean=1 masque la barre latérale (utilisé par le WebOS)
// L'état est aussi mémorisé (localStorage "uv-sidebar")
if (urlParams.has("clean")) {
  setSidebar(false);
} else if (localStorage.getItem("uv-sidebar") === "0") {
  setSidebar(false);
}
