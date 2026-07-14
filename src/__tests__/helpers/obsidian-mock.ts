/**
 * Minimal mock implementations of Obsidian API classes for testing.
 *
 * These mocks provide just enough surface area for view and utility tests
 * to instantiate and exercise their subjects. They do NOT replicate Obsidian's
 * runtime behaviour (e.g., no real CodeMirror, no file system).
 *
 * Usage:
 *   import { vi } from 'vitest';
 *   vi.mock('obsidian', () => import('./helpers/obsidian-mock'));
 */

// ─── Helper to create a chainable mock object ─────────────────────────────

function createMockApp(overrides?: Partial<MockAppOptions>): MockApp {
	return new MockApp(overrides);
}

// ─── Minimal type shims (mirror the subset of API used by tests) ──────────

export interface MockAppOptions {
	vaultFiles?: MockTFile[];
	vaultReadMap?: Map<string, string>;
	workspaceLeaves?: Record<string, MockWorkspaceLeaf[]>;
}

export class MockApp {
	workspace: MockWorkspace;
	vault: MockVault;

	constructor(opts?: Partial<MockAppOptions>) {
		this.workspace = new MockWorkspace(opts?.workspaceLeaves);
		this.vault = new MockVault(opts?.vaultFiles, opts?.vaultReadMap);
	}
}

// ─── Workspace ────────────────────────────────────────────────────────────

export class MockWorkspace {
	private leavesByType: Record<string, MockWorkspaceLeaf[]> = {};

	constructor(leavesByType?: Record<string, MockWorkspaceLeaf[]>) {
		this.leavesByType = leavesByType ?? {};
	}

	getLeavesOfType(type: string): MockWorkspaceLeaf[] {
		return this.leavesByType[type] ?? [];
	}

	getActiveViewOfType<T = unknown>(_viewType: new (...args: unknown[]) => T): T | null {
		return null;
	}

	onLayoutReady(cb: () => void): void {
		cb();
	}

	getLeaf(_newLeaf?: boolean): MockWorkspaceLeaf {
		return new MockWorkspaceLeaf();
	}

	revealLeaf(_leaf: MockWorkspaceLeaf): void {
		// no-op
	}

	getRightLeaf(_split?: boolean): MockWorkspaceLeaf | null {
		return new MockWorkspaceLeaf();
	}
}

// ─── WorkspaceLeaf ────────────────────────────────────────────────────────

export class MockWorkspaceLeaf {
	view: MockItemView | null = null;

	setViewState(_state: { type: string }): Promise<void> {
		return Promise.resolve();
	}

	openFile(_file: MockTFile, _options?: { active?: boolean }): Promise<void> {
		return Promise.resolve();
	}
}

// ─── ItemView ─────────────────────────────────────────────────────────────

export class MockItemView {
	contentEl: MockHTMLElement;
	app: MockApp;
	leaf: MockWorkspaceLeaf;

	constructor(leaf: MockWorkspaceLeaf) {
		this.leaf = leaf;
		this.app = new MockApp();
		this.contentEl = new MockHTMLElement();
	}

	getViewType(): string {
		return 'mock-view';
	}

	getDisplayText(): string {
		return 'Mock View';
	}

	getIcon(): string {
		return '';
	}

	async onOpen(): Promise<void> {
		// no-op
	}

	async onClose(): Promise<void> {
		// no-op
	}
}

// ─── Vault ────────────────────────────────────────────────────────────────

export class MockVault {
	private files: MockTFile[] = [];
	private readMap: Map<string, string> = new Map();
	private fileContents: Map<string, string> = new Map();

	constructor(files?: MockTFile[], readMap?: Map<string, string>) {
		this.files = files ?? [];
		if (readMap) {
			this.readMap = readMap;
		}
	}

	getMarkdownFiles(): MockTFile[] {
		return this.files;
	}

	read(file: MockTFile): Promise<string> {
		return Promise.resolve(this.readMap.get(file.path) ?? '');
	}

	append(_file: MockTFile, _content: string): Promise<void> {
		return Promise.resolve();
	}

	create(_path: string, _content: string): Promise<MockTFile> {
		return Promise.resolve(new MockTFile(_path));
	}

	modify(_file: MockTFile, _content: string): Promise<void> {
		return Promise.resolve();
	}

	getAbstractFileByPath(_path: string): MockTFile | null {
		const found = this.files.find((f) => f.path === _path);
		return found ?? null;
	}

	adapter = {
		exists: (_path: string): Promise<boolean> => {
			return Promise.resolve(this.files.some((f) => f.path === _path));
		},
	};
}

// ─── TFile ────────────────────────────────────────────────────────────────

export class MockTFile {
	path: string;
	basename: string;
	name: string;

	constructor(path: string) {
		this.path = path;
		const parts = path.split('/');
		const base = parts[parts.length - 1] ?? '';
		this.name = base;
		this.basename = base.replace(/\.md$/, '');
	}
}

// ─── Notice ───────────────────────────────────────────────────────────────

export class MockNotice {
	message: string;

	constructor(message: string) {
		this.message = message;
	}
}

// ─── Editor ───────────────────────────────────────────────────────────────

export class MockEditor {
	private lines: string[];
	private cursorLine = 0;
	private cursorCh = 0;

	constructor(content?: string) {
		this.lines = (content ?? '').split('\n');
	}

	getLine(line: number): string {
		return this.lines[line] ?? '';
	}

	setValue(value: string): void {
		this.lines = value.split('\n');
	}

	getValue(): string {
		return this.lines.join('\n');
	}

	getCursor(): { line: number; ch: number } {
		return { line: this.cursorLine, ch: this.cursorCh };
	}

	setCursor(pos: { line: number; ch: number }): void {
		this.cursorLine = pos.line;
		this.cursorCh = pos.ch;
	}

	replaceSelection(_text: string): void {
		// no-op
	}

	scrollIntoView(_range: { from: { line: number; ch: number }; to: { line: number; ch: number } }, _center?: boolean): void {
		// no-op
	}
}

// ─── MarkdownView ─────────────────────────────────────────────────────────

export class MockMarkdownView {
	editor: MockEditor;
	file: MockTFile | null;

	constructor(opts?: { content?: string; filePath?: string }) {
		this.editor = new MockEditor(opts?.content);
		this.file = opts?.filePath ? new MockTFile(opts.filePath) : null;
	}
}

// ─── Plugin ───────────────────────────────────────────────────────────────

export class MockPlugin {
	app: MockApp;
	private _data: Record<string, unknown> = {};
	private _intervals: number[] = [];
	private _commands: unknown[] = [];

	constructor() {
		this.app = new MockApp();
	}

	loadData(): Promise<Record<string, unknown>> {
		return Promise.resolve(this._data);
	}

	saveData(data: Record<string, unknown>): Promise<void> {
		this._data = data;
		return Promise.resolve();
	}

	registerInterval(id: number): number {
		this._intervals.push(id);
		return id;
	}

	addCommand(_command: unknown): void {
		this._commands.push(_command);
	}

	addSettingTab(_tab: unknown): void {
		// no-op
	}

	registerView(_type: string, _viewCreator: (leaf: MockWorkspaceLeaf) => MockItemView): void {
		// no-op
	}

	registerEditorExtension(_ext: unknown): void {
		// no-op
	}

	registerEvent(_event: unknown): void {
		// no-op
	}

	registerDomEvent(_el: unknown, _event: string, _handler: EventListener): void {
		// no-op
	}
}

// ─── HTMLElement mock (minimal subset) ────────────────────────────────────

export class MockHTMLElement {
	private _tagName = 'div';
	private _children: MockHTMLElement[] = [];
	private _classList: Set<string> = new Set();
	private _style: Record<string, string> = {};
	private _textContent = '';
	private _listeners: Map<string, EventListener> = new Map();
	private _attributes: Map<string, string> = new Map();

	// Store event listeners added via .addEventListener
	addEventListener(event: string, handler: EventListener): void {
		this._listeners.set(event, handler);
	}

	// For cleanup testing
	removeEventListener(event: string, handler?: EventListener): void {
		if (handler) {
			const existing = this._listeners.get(event);
			if (existing === handler) {
				this._listeners.delete(event);
			}
		} else {
			this._listeners.delete(event);
		}
	}

	addClass(cls: string): void {
		this._classList.add(cls);
	}

	removeClass(cls: string): void {
		this._classList.delete(cls);
	}

	empty(): void {
		this._children = [];
		this._textContent = '';
	}

	setText(text: string): void {
		this._textContent = text;
	}

	createDiv(opts?: { cls?: string; text?: string; attr?: Record<string, string> }): MockHTMLElement {
		const el = new MockHTMLElement();
		if (opts?.cls) el.addClass(opts.cls);
		if (opts?.text) el.setText(opts.text);
		this._children.push(el);
		return el;
	}

	createEl(
		tag: string,
		opts?: { cls?: string; text?: string; attr?: Record<string, string>; value?: string },
	): MockHTMLElement {
		const el = new MockHTMLElement();
		el._tagName = tag;
		if (opts?.cls) el.addClass(opts.cls);
		if (opts?.text) el.setText(opts.text);
		if (opts?.value !== undefined) el._attributes.set('value', opts.value);
		if (opts?.attr) {
			for (const [k, v] of Object.entries(opts.attr)) {
				el._attributes.set(k, v);
			}
		}
		this._children.push(el);
		return el;
	}
}

// ─── Setting (minimal stub) ───────────────────────────────────────────────

export class MockSetting {
	// eslint-disable-next-line @typescript-eslint/no-useless-constructor -- stub must match real API signature
	constructor(_containerEl: MockHTMLElement, _name: string, _desc?: string) {
	}

	setName(_name: string): this {
		return this;
	}

	setDesc(_desc: string): this {
		return this;
	}

	addText(_cb: (component: { setValue: (v: string) => void; setPlaceholder: (v: string) => void }) => void): this {
		return this;
	}

	addDropdown(_cb: (component: { addOption: (v: string, label: string) => void; setValue: (v: string) => void; onChange: (cb: (v: string) => void) => void }) => void): this {
		return this;
	}

	addToggle(_cb: (component: { setValue: (v: boolean) => void; onChange: (cb: (v: boolean) => void) => void }) => void): this {
		return this;
	}

	addButton(_cb: (component: { setButtonText: (text: string) => void; onClick: (cb: () => void) => void }) => void): this {
		return this;
	}

	addSlider(_cb: (component: { setLimits: (min: number, max: number, step: number) => void; setValue: (v: number) => void; onChange: (cb: (v: number) => void) => void; setDynamicTooltip: () => void }) => void): this {
		return this;
	}
}

// ─── Factory: default mock module ─────────────────────────────────────────

/**
 * Returns the complete mock module that can be used with vi.mock('obsidian', ...).
 *
 * Usage:
 *   vi.mock('obsidian', () => obsidianMockModule());
 */
export function obsidianMockModule() {
	return {
		ItemView: MockItemView,
		WorkspaceLeaf: MockWorkspaceLeaf,
		Notice: MockNotice,
		TFile: MockTFile,
		Vault: MockVault,
		MarkdownView: MockMarkdownView,
		Plugin: MockPlugin,
		App: MockApp,
		Editor: MockEditor,
		Setting: MockSetting,
		Workspace: MockWorkspace,
		MockApp,
		MockWorkspace,
		MockWorkspaceLeaf,
		MockItemView,
		MockVault,
		MockTFile,
		MockNotice,
		MockEditor,
		MockMarkdownView,
		MockPlugin,
		MockSetting,
		createMockApp,
		default: {
			ItemView: MockItemView,
			WorkspaceLeaf: MockWorkspaceLeaf,
			Notice: MockNotice,
			TFile: MockTFile,
			Vault: MockVault,
			MarkdownView: MockMarkdownView,
			Plugin: MockPlugin,
			App: MockApp,
			Editor: MockEditor,
			Setting: MockSetting,
			Workspace: MockWorkspace,
		},
	};
}
