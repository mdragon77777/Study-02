// 할 일 관리 앱
// 흐름: 상태(todos) 변경 → save() → render()
// 상태를 바꾸는 함수는 항상 마지막에 commit()을 호출한다.

const STORAGE_KEY = 'todos';
const FILTER_KEY = 'todoFilter';
const MAX_LENGTH = 100;
const CATEGORY_LABELS = {
  work: '업무',
  personal: '개인',
  study: '공부',
};

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const categorySelect = document.getElementById('todo-category');
const list = document.getElementById('todo-list');
const clearDoneButton = document.getElementById('clear-done');
const filterNav = document.querySelector('.filters');
const filterTabs = [...filterNav.querySelectorAll('.filter-tab')];
const progressTotalText = document.getElementById('progress-total-text');
const progressTotalFill = document.getElementById('progress-total-fill');
const progressHint = document.getElementById('progress-hint');
const emptyState = document.getElementById('empty-state');

let todos = load();
let filter = loadFilter();

// 편집 중인 항목(화면 상태, 저장하지 않음).
// 편집 중 다른 조작으로 render()가 다시 돌아도 입력 중인 값이 사라지지 않도록 draft에 보관한다.
let editingId = null;
let editDraft = { text: '', category: 'work' };

// ===== 저장 =====

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadFilter() {
  try {
    const value = localStorage.getItem(FILTER_KEY);
    return value === 'all' || value in CATEGORY_LABELS ? value : 'all';
  } catch {
    return 'all';
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // 시크릿 모드 등에서 저장이 막혀도 화면 동작은 유지한다.
  }
}

function commit() {
  save();
  render();
}

// ===== 상태 변경 =====

function normalizeText(text) {
  return text.trim().slice(0, MAX_LENGTH);
}

function addTodo(text, category) {
  const trimmed = normalizeText(text);
  if (!trimmed) return false;

  const now = Date.now();
  todos.push({
    id: String(now),
    text: trimmed,
    category,
    done: false,
    createdAt: now,
  });
  commit();
  return true;
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  commit();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  if (editingId === id) editingId = null;
  commit();
}

function clearDone() {
  todos = todos.filter((t) => !t.done);
  if (editingId && !todos.some((t) => t.id === editingId)) editingId = null;
  commit();
}

function setFilter(value) {
  if (value !== 'all' && !(value in CATEGORY_LABELS)) return;
  filter = value;
  editingId = null; // 편집 중인 항목이 필터로 가려질 수 있으므로 편집은 취소한다
  // 특정 카테고리를 보는 중에 추가한 항목이 바로 보이도록 입력 카테고리도 맞춘다.
  if (value !== 'all') categorySelect.value = value;
  try {
    localStorage.setItem(FILTER_KEY, value);
  } catch {
    // 저장이 막혀도 필터 동작은 유지한다.
  }
  render();
}

function startEdit(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  editingId = id;
  editDraft = { text: todo.text, category: todo.category };
  render();
  const editInput = document.getElementById('edit-text-' + id);
  editInput?.focus();
  editInput?.select();
}

function cancelEdit() {
  const id = editingId;
  editingId = null;
  render();
  focusItemControl(id, '[data-action="edit"]');
}

function saveEdit() {
  const todo = todos.find((t) => t.id === editingId);
  if (!todo) {
    editingId = null;
    render();
    return;
  }
  const trimmed = normalizeText(editDraft.text);
  if (!trimmed) return; // 빈 내용은 저장하지 않고 편집 상태 유지

  todo.text = trimmed;
  todo.category = editDraft.category;
  editingId = null;
  commit();
  focusItemControl(todo.id, '[data-action="edit"]');
}

// ===== 렌더링 =====

// 현재 필터에 맞는 항목을 미완료 → 완료 순, 같은 그룹 안에서는 생성 순으로 정렬
function visibleTodos() {
  return todos
    .filter((t) => filter === 'all' || t.category === filter)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt);
}

function createButton(text, action, ariaLabel, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = ('btn btn-icon ' + extraClass).trim();
  button.dataset.action = action;
  button.textContent = text;
  button.setAttribute('aria-label', ariaLabel);
  return button;
}

function createBadge(category) {
  const badge = document.createElement('span');
  badge.className = 'badge badge-' + category;
  badge.textContent = CATEGORY_LABELS[category] || category;
  return badge;
}

function createTodoItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.done ? ' is-done' : '');
  li.dataset.id = todo.id;

  const checkboxId = 'todo-' + todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = checkboxId;
  checkbox.className = 'todo-check';
  checkbox.checked = todo.done;

  // label은 체크박스 접근성 이름용. 텍스트 클릭으로는 토글하지 않는다(더블클릭 = 수정).
  const label = document.createElement('label');
  label.htmlFor = checkboxId;
  label.className = 'todo-text';
  label.textContent = todo.text;
  label.title = '더블클릭하여 수정';

  const actions = document.createElement('div');
  actions.className = 'todo-actions';
  actions.append(
    createButton('수정', 'edit', `"${todo.text}" 수정`),
    createButton('삭제', 'delete', `"${todo.text}" 삭제`, 'btn-danger')
  );

  li.append(checkbox, label, createBadge(todo.category), actions);
  return li;
}

function createEditItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item is-editing';
  li.dataset.id = todo.id;

  const textId = 'edit-text-' + todo.id;
  const categoryId = 'edit-category-' + todo.id;

  const textLabel = document.createElement('label');
  textLabel.htmlFor = textId;
  textLabel.className = 'visually-hidden';
  textLabel.textContent = '할 일 내용 수정';

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.id = textId;
  textInput.className = 'edit-input';
  textInput.maxLength = MAX_LENGTH;
  textInput.value = editDraft.text;
  textInput.dataset.field = 'text';

  const categoryLabel = document.createElement('label');
  categoryLabel.htmlFor = categoryId;
  categoryLabel.className = 'visually-hidden';
  categoryLabel.textContent = '카테고리 수정';

  const select = document.createElement('select');
  select.id = categoryId;
  select.className = 'edit-category';
  select.dataset.field = 'category';
  Object.entries(CATEGORY_LABELS).forEach(([value, text]) => {
    select.append(new Option(text, value, false, value === editDraft.category));
  });

  const actions = document.createElement('div');
  actions.className = 'todo-actions';
  actions.append(
    createButton('저장', 'save', '수정 내용 저장', 'btn-save'),
    createButton('취소', 'cancel', '수정 취소')
  );

  li.append(textLabel, textInput, categoryLabel, select, actions);
  return li;
}

function render() {
  // 편집 중에 다시 그려도 포커스를 잃지 않도록 현재 포커스 위치를 기억한다.
  const focusedId = document.activeElement?.id;

  const items = visibleTodos();
  const fragment = document.createDocumentFragment();
  items.forEach((todo) => {
    fragment.append(todo.id === editingId ? createEditItem(todo) : createTodoItem(todo));
  });
  list.replaceChildren(fragment);
  renderEmptyState(items.length);

  if (focusedId && list.querySelector('#' + CSS.escape(focusedId))) {
    document.getElementById(focusedId).focus();
  }

  renderProgress();
  renderFilters();
  clearDoneButton.disabled = !todos.some((t) => t.done);
}

function renderEmptyState(visibleCount) {
  emptyState.hidden = visibleCount > 0;
  if (visibleCount > 0) return;
  emptyState.textContent =
    todos.length === 0 || filter === 'all'
      ? '오늘 할 일을 추가해 보세요'
      : `${CATEGORY_LABELS[filter]} 카테고리에 할 일이 없습니다`;
}

function calcProgress(items) {
  const total = items.length;
  const done = items.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}

function updateBar(bar, fill, text, { total, done, percent }) {
  fill.style.width = percent + '%';
  bar.setAttribute('aria-valuenow', percent);
  text.textContent = `${done} / ${total} (${percent}%)`;
}

// 진행률은 필터와 상관없이 항상 전체 데이터 기준으로 계산한다.
function renderProgress() {
  const totalProgress = calcProgress(todos);
  updateBar(progressTotalFill.parentElement, progressTotalFill, progressTotalText, totalProgress);
  progressHint.hidden = totalProgress.total > 0;

  document.querySelectorAll('.progress-category').forEach((item) => {
    const category = item.dataset.category;
    updateBar(
      item.querySelector('.progress-bar'),
      item.querySelector('.progress-fill'),
      item.querySelector('.progress-cat-text'),
      calcProgress(todos.filter((t) => t.category === category))
    );
  });
}

function renderFilters() {
  filterTabs.forEach((tab) => {
    const active = tab.dataset.filter === filter;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
}

function focusItemControl(id, selector) {
  if (!id) return;
  list.querySelector(`.todo-item[data-id="${CSS.escape(id)}"] ${selector}`)?.focus();
}

// ===== 이벤트 =====

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (addTodo(input.value, categorySelect.value)) {
    input.value = '';
  }
  input.focus();
});

// 아래는 모두 목록 컨테이너 하나에 이벤트를 위임한다.

list.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('.todo-check')) {
    const id = target.closest('.todo-item').dataset.id;
    toggleTodo(id);
    // 다시 그려진 같은 항목의 체크박스로 포커스를 옮겨 키보드 조작을 이어가게 한다.
    document.getElementById('todo-' + id)?.focus();
  } else if (target.dataset.field === 'category') {
    editDraft.category = target.value;
  }
});

list.addEventListener('input', (event) => {
  if (event.target.dataset.field === 'text') {
    editDraft.text = event.target.value;
  }
});

list.addEventListener('click', (event) => {
  // 텍스트(label) 클릭이 체크박스를 토글하지 않게 막는다.
  if (event.target.closest('.todo-text')) {
    event.preventDefault();
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.closest('.todo-item').dataset.id;

  switch (button.dataset.action) {
    case 'edit':
      startEdit(id);
      break;
    case 'save':
      saveEdit();
      break;
    case 'cancel':
      cancelEdit();
      break;
    case 'delete': {
      const todo = todos.find((t) => t.id === id);
      if (todo && confirm(`"${todo.text}"을(를) 삭제할까요?`)) {
        // 삭제된 버튼 대신 같은 자리의 다음 항목(없으면 이전 항목, 그것도 없으면 입력창)으로 포커스를 옮긴다.
        const index = visibleTodos().findIndex((t) => t.id === id);
        deleteTodo(id);
        const rest = visibleTodos();
        const neighbor = rest[Math.min(index, rest.length - 1)];
        if (neighbor) {
          focusItemControl(neighbor.id, neighbor.id === editingId ? '.edit-input' : '.todo-check');
        } else {
          input.focus();
        }
      }
      break;
    }
  }
});

list.addEventListener('dblclick', (event) => {
  const text = event.target.closest('.todo-text');
  if (!text) return;
  startEdit(text.closest('.todo-item').dataset.id);
});

list.addEventListener('keydown', (event) => {
  if (!event.target.closest('.is-editing')) return;
  if (event.isComposing) return; // 한글 조합 중 Enter는 무시

  if (event.key === 'Enter' && event.target.dataset.field) {
    event.preventDefault();
    saveEdit();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
});

filterNav.addEventListener('click', (event) => {
  const tab = event.target.closest('.filter-tab');
  if (tab) setFilter(tab.dataset.filter);
});

// 탭 목록 키보드 조작: ←/→ 로 이동, Home/End 로 처음/끝
filterNav.addEventListener('keydown', (event) => {
  const index = filterTabs.findIndex((tab) => tab.dataset.filter === filter);
  const last = filterTabs.length - 1;
  const next = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    Home: 0,
    End: last,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  setFilter(filterTabs[next].dataset.filter);
  filterTabs[next].focus();
});

clearDoneButton.addEventListener('click', () => {
  const count = todos.filter((t) => t.done).length;
  if (count && confirm(`완료된 할 일 ${count}개를 삭제할까요?`)) {
    clearDone();
    input.focus(); // 버튼이 비활성화되며 포커스를 잃으므로 입력창으로 옮긴다
  }
});

if (filter !== 'all') categorySelect.value = filter;
render();
