"use strict";

const state = {
  navigation: null,
  currentBook: null,
  currentChapter: null,
};

const ACCESS_PASSWORD = "4365";
const ACCESS_SESSION_KEY = "ai-agent-course-access";

const elements = {
  authGate: document.querySelector("#auth-gate"),
  authForm: document.querySelector("#auth-form"),
  authPassword: document.querySelector("#auth-password"),
  authMessage: document.querySelector("#auth-message"),
  bookMenu: document.querySelector("#book-menu"),
  chapterMenu: document.querySelector("#chapter-menu"),
  chapterContent: document.querySelector("#chapter-content"),
  currentBookTitle: document.querySelector("#current-book-title"),
  pageStatus: document.querySelector("#page-status"),
  previousChapter: document.querySelector("#previous-chapter"),
  nextChapter: document.querySelector("#next-chapter"),
  search: document.querySelector("#chapter-search"),
  sidebar: document.querySelector("#chapter-sidebar"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  sidebarClose: document.querySelector("#sidebar-close"),
  sidebarBackdrop: document.querySelector("#sidebar-backdrop"),
};

function unlockPage() {
  sessionStorage.setItem(ACCESS_SESSION_KEY, "granted");
  document.body.classList.remove("auth-locked");
  elements.authGate.hidden = true;
  initialize();
}

function handleAuthentication(event) {
  event.preventDefault();

  if (elements.authPassword.value === ACCESS_PASSWORD) {
    unlockPage();
    return;
  }

  elements.authPassword.value = "";
  elements.authPassword.setAttribute("aria-invalid", "true");
  elements.authMessage.textContent = "비밀번호가 올바르지 않습니다.";
  elements.authPassword.focus();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chapterRoute(bookId, chapterId) {
  return `#/${bookId}/${chapterId}`;
}

function parseRoute() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { bookId: parts[0], chapterId: parts[1] };
}

function resolveRoute() {
  const { bookId, chapterId } = parseRoute();
  const books = state.navigation.books;
  const book = books.find((item) => item.id === bookId) ?? books[0];
  const chapter = book.chapters.find((item) => item.id === chapterId) ?? book.chapters[0];
  return { book, chapter };
}

function renderBookMenu() {
  elements.bookMenu.innerHTML = state.navigation.books
    .map(
      (book) => `
        <a
          class="book-tab${book.id === state.currentBook.id ? " is-active" : ""}"
          href="${chapterRoute(book.id, book.chapters[0].id)}"
          ${book.id === state.currentBook.id ? 'aria-current="page"' : ""}
        >
          <span>${escapeHtml(book.shortTitle)}</span>
          <small>${escapeHtml(book.title)}</small>
        </a>
      `,
    )
    .join("");
}

function renderChapterMenu(filter = "") {
  const normalizedFilter = filter.trim().toLocaleLowerCase("ko");
  const chapters = state.currentBook.chapters.filter((chapter) =>
    `${chapter.id} ${chapter.title}`.toLocaleLowerCase("ko").includes(normalizedFilter),
  );

  if (chapters.length === 0) {
    elements.chapterMenu.innerHTML = '<p class="empty-search">검색 결과가 없습니다.</p>';
    return;
  }

  elements.chapterMenu.innerHTML = chapters
    .map(
      (chapter, index) => `
        <a
          class="chapter-link${chapter.id === state.currentChapter.id ? " is-active" : ""}"
          href="${chapterRoute(state.currentBook.id, chapter.id)}"
          ${chapter.id === state.currentChapter.id ? 'aria-current="page"' : ""}
        >
          <span class="chapter-number">${escapeHtml(chapter.label ?? chapter.id.replace("ch", "CH "))}</span>
          <span class="chapter-name">${escapeHtml(chapter.title)}</span>
          ${chapter.source === true ? '<span class="source-badge">소스</span>' : ""}
          ${chapter.textbookSource === true ? '<span class="textbook-source-badge">교재</span>' : ""}
          ${chapter.practice === true ? '<span class="practice-badge">실습</span>' : ""}
        </a>
      `,
    )
    .join("");
}

function setPagination() {
  const chapters = state.currentBook.chapters;
  const index = chapters.findIndex((chapter) => chapter.id === state.currentChapter.id);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];

  setPaginationLink(elements.previousChapter, previous, "previous");
  setPaginationLink(elements.nextChapter, next, "next");
}

function setPaginationLink(element, chapter, direction) {
  const title = element.querySelector(".pagination-title");
  if (!chapter) {
    element.classList.add("is-disabled");
    element.removeAttribute("href");
    element.setAttribute("aria-disabled", "true");
    title.textContent = direction === "previous" ? "첫 번째 챕터입니다" : "마지막 챕터입니다";
    return;
  }

  element.classList.remove("is-disabled");
  element.removeAttribute("aria-disabled");
  element.href = chapterRoute(state.currentBook.id, chapter.id);
  title.textContent = chapter.title;
}

function renderEmptyChapter() {
  const chapterNumber = state.currentChapter.label ?? state.currentChapter.id.replace("ch", "Chapter ");
  elements.chapterContent.innerHTML = `
    <section class="empty-chapter">
      <p class="content-eyebrow">${escapeHtml(state.currentBook.shortTitle)} · ${escapeHtml(chapterNumber)}</p>
      <h1>${escapeHtml(state.currentChapter.title)}</h1>
      <p>이 챕터의 Markdown 콘텐츠는 아직 비어 있습니다.</p>
      <code>${escapeHtml(state.currentChapter.file)}</code>
    </section>
  `;
}

async function loadChapter() {
  elements.pageStatus.textContent = `${state.currentChapter.title} 불러오는 중`;
  elements.chapterContent.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(state.currentChapter.file, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const markdown = await response.text();
    if (!markdown.trim()) {
      renderEmptyChapter();
    } else if (!window.marked || !window.DOMPurify) {
      throw new Error("Markdown 렌더링 라이브러리를 불러오지 못했습니다.");
    } else {
      const unsafeHtml = window.marked.parse(markdown, { gfm: true, breaks: false });
      elements.chapterContent.innerHTML = window.DOMPurify.sanitize(unsafeHtml);
    }

    elements.pageStatus.textContent = `${state.currentChapter.title} 표시 완료`;
    document.title = `${state.currentChapter.title} | ${state.navigation.siteTitle}`;
  } catch (error) {
    elements.chapterContent.innerHTML = `
      <section class="error-state">
        <p class="content-eyebrow">콘텐츠 오류</p>
        <h1>${escapeHtml(state.currentChapter.title)}</h1>
        <p>문서를 불러오지 못했습니다.</p>
        <code>${escapeHtml(state.currentChapter.file)}</code>
        <p class="error-detail">${escapeHtml(error.message)}</p>
      </section>
    `;
    elements.pageStatus.textContent = `${state.currentChapter.title} 불러오기 실패`;
  } finally {
    elements.chapterContent.removeAttribute("aria-busy");
  }
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  elements.sidebarToggle.setAttribute("aria-expanded", "false");
}

function openSidebar() {
  document.body.classList.add("sidebar-open");
  elements.sidebarToggle.setAttribute("aria-expanded", "true");
}

async function renderRoute() {
  const { book, chapter } = resolveRoute();
  const canonicalRoute = chapterRoute(book.id, chapter.id);
  if (window.location.hash !== canonicalRoute) {
    history.replaceState(null, "", canonicalRoute);
  }

  state.currentBook = book;
  state.currentChapter = chapter;
  elements.currentBookTitle.textContent = book.title;
  elements.search.value = "";

  renderBookMenu();
  renderChapterMenu();
  setPagination();
  await loadChapter();
  closeSidebar();
  elements.chapterContent.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

async function initialize() {
  try {
    const response = await fetch("data/navigation.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`navigation.json HTTP ${response.status}`);
    }
    state.navigation = await response.json();
    await renderRoute();
  } catch (error) {
    elements.chapterContent.innerHTML = `
      <section class="error-state">
        <p class="content-eyebrow">초기화 오류</p>
        <h1>교육 사이트를 시작하지 못했습니다.</h1>
        <p>정적 웹 서버에서 실행 중인지 확인하세요.</p>
        <code>${escapeHtml(error.message)}</code>
      </section>
    `;
  }
}

elements.search.addEventListener("input", (event) => renderChapterMenu(event.target.value));
elements.sidebarToggle.addEventListener("click", () => {
  document.body.classList.contains("sidebar-open") ? closeSidebar() : openSidebar();
});
elements.sidebarClose.addEventListener("click", closeSidebar);
elements.sidebarBackdrop.addEventListener("click", closeSidebar);
window.addEventListener("hashchange", () => {
  if (state.navigation) renderRoute();
});

elements.authForm.addEventListener("submit", handleAuthentication);
elements.authPassword.addEventListener("input", () => {
  elements.authPassword.removeAttribute("aria-invalid");
  elements.authMessage.textContent = "";
});

if (sessionStorage.getItem(ACCESS_SESSION_KEY) === "granted") {
  unlockPage();
} else {
  elements.authPassword.focus();
}
