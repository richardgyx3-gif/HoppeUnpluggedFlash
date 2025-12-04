// Hoppe语录闪卡网站 - 主要JavaScript功能

class HoppeFlashcards {
    constructor() {
        this.data = null;
        this.currentIndex = 0;
        this.currentQuotes = [];
        this.filteredQuotes = [];
        this.activeChapterId = null; // 当前选中的章节ID
        
        // DOM元素
        this.elements = {
            loading: document.getElementById('loading'),
            sidebar: document.getElementById('sidebar'),
            sidebarBackBtn: document.getElementById('sidebarBackBtn'),
            menuToggle: document.getElementById('menuToggle'),
            hoppeIntroBtn: document.getElementById('hoppeIntroBtn'),
            chapterNav: document.getElementById('chapterNav'),
            flashcard: document.getElementById('flashcard'),
            chapterName: document.getElementById('chapterName'),
            question: document.getElementById('question'),
            answer: document.getElementById('answer'),
            randomBtn: document.getElementById('randomBtn'),
            nextBtn: document.getElementById('nextBtn'),
            prevBtn: document.getElementById('prevBtn'),

            hoppeInfoModal: document.getElementById('hoppeInfoModal'),
            hoppeInfoClose: document.getElementById('hoppeInfoClose'),
            toast: document.getElementById('toast')
        };
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.setupNavigation();
            
            // 默认侧边栏关闭，用户点击按钮打开
            
            this.updateDisplay();
            this.hideLoading();
            this.showToast('欢迎来到Hoppe语录！', 'success');
        } catch (error) {
            console.error('初始化失败:', error);
            this.showToast('加载数据失败，请刷新页面重试', 'error');
        }
    }
    
    async loadData() {
        try {
            // 从外部数据文件加载数据
            this.data = HOPPE_DATA;
            this.currentQuotes = this.getAllQuotes();
            this.filteredQuotes = [...this.currentQuotes];
        } catch (error) {
            console.error('加载数据时出错:', error);
            throw error;
        }
    }
    
    getAllQuotes() {
        const allQuotes = [];
        this.data.chapters.forEach(chapter => {
            chapter.quotes.forEach(quote => {
                allQuotes.push({
                    ...quote,
                    chapterId: chapter.id,
                    chapterTitle: chapter.title,
                    chapterSubtitle: chapter.subtitle
                });
            });
        });
        return allQuotes;
    }
    
    setupEventListeners() {
        // 菜单控制
        this.elements.sidebarBackBtn.addEventListener('click', () => this.closeSidebar());
        this.elements.menuToggle.addEventListener('click', () => this.openSidebar());
        
        // Hoppe介绍页面
        this.elements.hoppeIntroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHoppeInfo();
        });
        this.elements.hoppeInfoClose.addEventListener('click', () => this.closeHoppeInfo());
        this.elements.hoppeInfoModal.addEventListener('click', (e) => {
            if (e.target === this.elements.hoppeInfoModal) {
                this.closeHoppeInfo();
            }
        });
        
        // 搜索功能
        // 闪卡控制
        this.elements.randomBtn.addEventListener('click', () => this.showRandomCard());
        this.elements.nextBtn.addEventListener('click', () => this.nextCard());
        this.elements.prevBtn.addEventListener('click', () => this.prevCard());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // 点击侧边栏外部关闭移动端菜单
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                this.elements.sidebar.classList.contains('open') && 
                !this.elements.sidebar.contains(e.target) && 
                !this.elements.menuToggle.contains(e.target)) {
                this.closeSidebar();
            }
        });
        
        // 响应式侧边栏控制
        window.addEventListener('resize', () => {
            // 保持当前状态，不需要特殊处理
        });
    }
    
    setupNavigation() {
        const navHtml = this.data.chapters.map((chapter, chapterIndex) => {
            const quotesHtml = chapter.quotes.map((quote, index) => `
                <a href="#" class="quote-link" data-chapter="${chapter.id}" data-quote="${quote.id}">
                    <div class="quote-number">${index + 1}</div>
                    <div class="quote-preview">${quote.question.length > 20 ? quote.question.substring(0, 20) + '...' : quote.question}</div>
                </a>
            `).join('');
            
            // 默认展开第一个章节
            const isExpanded = chapterIndex === 0 ? 'expanded' : '';
            
            return `
                <div class="chapter-group ${isExpanded}">
                    <div class="chapter-header" data-chapter="${chapter.id}">
                        <div class="chapter-info">
                            <div class="chapter-title">${chapter.title}</div>
                            <div class="chapter-subtitle">${chapter.subtitle}</div>
                        </div>
                        <div class="chapter-toggle">
                            <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9,18 15,12 9,6"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="quotes-list">
                        ${quotesHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        this.elements.chapterNav.innerHTML = navHtml;
        
        // 设置第一个章节的箭头方向
        const firstToggle = this.elements.chapterNav.querySelector('.chapter-group.expanded .toggle-icon');
        if (firstToggle) {
            firstToggle.style.transform = 'rotate(90deg)';
        }
        
        // 章节组点击事件（展开/收起）
        this.elements.chapterNav.addEventListener('click', (e) => {
            const chapterHeader = e.target.closest('.chapter-header');
            const quoteLink = e.target.closest('.quote-link');
            const chapterToggle = e.target.closest('.chapter-toggle');
            
            // 如果点击的是展开/收起图标，只处理展开/收起
            if (chapterHeader && !chapterToggle) {
                e.preventDefault();
                const chapterId = chapterHeader.dataset.chapter;
                const group = chapterHeader.parentElement;
                const toggle = chapterHeader.querySelector('.toggle-icon');
                
                // 如果当前是收起状态，展开并显示该章节
                if (!group.classList.contains('expanded')) {
                    group.classList.add('expanded');
                    toggle.style.transform = 'rotate(90deg)';
                }
                
                // 选择该章节（但保持侧边栏打开，让用户看到卡片列表）
                this.showChapter(chapterId);
                this.updateActiveChapter(chapterId);
                return;
            }
            
            // 处理展开/收起图标点击
            if (chapterToggle) {
                e.preventDefault();
                const group = chapterHeader.parentElement;
                const toggle = chapterHeader.querySelector('.toggle-icon');
                
                if (group.classList.contains('expanded')) {
                    group.classList.remove('expanded');
                    toggle.style.transform = 'rotate(0deg)';
                } else {
                    group.classList.add('expanded');
                    toggle.style.transform = 'rotate(90deg)';
                }
            }
            
            // 处理语录链接点击
            if (quoteLink) {
                e.preventDefault();
                const chapterId = quoteLink.dataset.chapter;
                const quoteId = quoteLink.dataset.quote;
                
                this.showSpecificQuote(chapterId, quoteId);
                this.updateActiveChapter(chapterId);
                this.closeSidebar();
            }
        });
    }
    
    updateActiveChapter(chapterId) {
        document.querySelectorAll('.chapter-link, .quote-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // 高亮当前章节
        const activeChapter = document.querySelector(`[data-chapter="${chapterId}"].chapter-header`);
        if (activeChapter) {
            activeChapter.classList.add('active');
        }
    }
    
    showSpecificQuote(chapterId, quoteId) {
        const chapter = this.data.chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        
        const quote = chapter.quotes.find(q => q.id === quoteId);
        if (!quote) return;
        
        // 保存当前状态
        this.activeChapterId = chapterId;
        
        // 重新构建当前语录列表，只包含该章节
        this.buildCurrentQuotes();
        
        // 找到指定quote在filteredQuotes中的正确位置
        this.currentIndex = this.filteredQuotes.findIndex(q => q.id === quoteId);
        if (this.currentIndex === -1) {
            this.currentIndex = 0; // 如果没找到，设为第一个
        }
        
        this.updateDisplay();
        this.showToast(`已跳转到「${chapter.title}」的特定语录`, 'success');
        
        // 更新活跃章节状态
        this.updateActiveChapter(chapterId);
    }
    
    showRandomCard() {
        // 随机抽取总是从所有卡片中进行，不受当前章节过滤影响
        const allQuotes = this.getAllQuotes();
        if (allQuotes.length === 0) {
            this.showToast('没有找到语录', 'warning');
            return;
        }
        
        // 在所有卡片中随机选择
        const randomIndex = Math.floor(Math.random() * allQuotes.length);
        const selectedQuote = allQuotes[randomIndex];
        
        // 如果随机选中的卡片不在当前过滤列表中，更新currentQuotes
        const currentQuote = this.filteredQuotes[this.currentIndex];
        if (!currentQuote || currentQuote.id !== selectedQuote.id) {
            // 找到选中卡片在filteredQuotes中的位置
            const newFilteredIndex = this.filteredQuotes.findIndex(q => q.id === selectedQuote.id);
            if (newFilteredIndex !== -1) {
                this.currentIndex = newFilteredIndex;
            } else {
                // 如果当前有章节过滤，选中的卡片不在当前章节，则重置过滤
                this.activeChapterId = null;
                this.buildCurrentQuotes();
                this.currentIndex = this.filteredQuotes.findIndex(q => q.id === selectedQuote.id);
            }
        }
        
        this.updateDisplay();
        this.showToast('随机抽取了一张新语录', 'success');
    }
    
    nextCard() {
        if (this.filteredQuotes.length === 0) {
            this.showToast('没有可显示的语录', 'warning');
            return;
        }
        
        if (this.currentIndex < this.filteredQuotes.length - 1) {
            // 在当前章节内继续翻页
            this.currentIndex++;
            this.updateDisplay();
        } else {
            // 到达当前章节末尾，跳转到下一章节
            this.navigateToNextChapter();
        }
    }
    
    prevCard() {
        if (this.filteredQuotes.length === 0) {
            this.showToast('没有可显示的语录', 'warning');
            return;
        }
        
        if (this.currentIndex > 0) {
            // 在当前章节内继续翻页
            this.currentIndex--;
            this.updateDisplay();
        } else {
            // 到达当前章节开始，跳转到上一章节
            this.navigateToPrevChapter();
        }
    }
    
    navigateToNextChapter() {
        if (!this.activeChapterId || !this.data) return;
        
        const currentChapterIndex = this.data.chapters.findIndex(c => c.id === this.activeChapterId);
        if (currentChapterIndex === -1) return;
        
        // 如果有下一章节
        if (currentChapterIndex < this.data.chapters.length - 1) {
            const nextChapter = this.data.chapters[currentChapterIndex + 1];
            this.activeChapterId = nextChapter.id;
            this.buildCurrentQuotes();
            this.currentIndex = 0; // 跳转到下一章节的第一张
            this.updateDisplay();
            this.updateActiveChapter(nextChapter.id);
            this.showToast(`已跳转到下一章节：${nextChapter.title}`, 'info');
        } else {
            // 已经是最后一个章节
            this.showToast('已经是最后一个章节了', 'info');
        }
    }
    
    navigateToPrevChapter() {
        if (!this.activeChapterId || !this.data) return;
        
        const currentChapterIndex = this.data.chapters.findIndex(c => c.id === this.activeChapterId);
        if (currentChapterIndex === -1) return;
        
        // 如果有上一章节
        if (currentChapterIndex > 0) {
            const prevChapter = this.data.chapters[currentChapterIndex - 1];
            this.activeChapterId = prevChapter.id;
            this.buildCurrentQuotes();
            this.currentIndex = this.filteredQuotes.length - 1; // 跳转到上一章节的最后一张
            this.updateDisplay();
            this.updateActiveChapter(prevChapter.id);
            this.showToast(`已跳转到上一章节：${prevChapter.title}`, 'info');
        } else {
            // 已经是第一个章节
            this.showToast('已经是第一个章节了', 'info');
        }
    }
    
    showChapter(chapterId) {
        const chapter = this.data.chapters.find(c => c.id === chapterId);
        if (!chapter) return;
        
        // 保存当前状态
        const wasFromChapter = this.activeChapterId === chapterId;
        this.activeChapterId = chapterId;
        
        // 删除章节选择弹窗提示 - 用户已明确要求删除该弹窗
        
        // 重新构建当前语录列表，只应用章节过滤
        this.buildCurrentQuotes();
        this.updateDisplay();
        this.updateActiveChapter(chapterId);
    }
    
    // 构建当前语录列表，应用章节过滤
    buildCurrentQuotes() {
        // 起始语录列表
        let quotes = this.getAllQuotes();
        
        // 应用章节过滤
        if (this.activeChapterId) {
            quotes = quotes.filter(q => q.chapterId === this.activeChapterId);
        }
        
        this.filteredQuotes = quotes;
        
        // 调整当前索引
        if (this.currentIndex >= this.filteredQuotes.length) {
            this.currentIndex = Math.max(0, this.filteredQuotes.length - 1);
        }
    }
    
    updateDisplay() {
        if (this.filteredQuotes.length === 0) {
            this.showEmptyState();
            return;
        }
        
        const currentQuote = this.filteredQuotes[this.currentIndex];
        const originalIndex = this.currentQuotes.findIndex(q => q.id === currentQuote.id);
        
        // 更新内容
        this.elements.chapterName.textContent = currentQuote.chapterTitle;
        this.elements.question.textContent = currentQuote.question;
        this.elements.answer.textContent = currentQuote.answer;
        
        // 更新章节激活状态
        this.updateActiveChapter(currentQuote.chapterId);
        
        // 添加动画效果
        this.addCardAnimation();
    }
    
    showEmptyState() {
        this.elements.question.textContent = '没有找到匹配的语录';
        this.elements.answer.textContent = '请选择其他章节。';
        this.elements.chapterName.textContent = '';
    }
    
    addCardAnimation() {
        this.elements.flashcard.style.opacity = '0.7';
        this.elements.flashcard.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            this.elements.flashcard.style.opacity = '1';
            this.elements.flashcard.style.transform = 'translateY(0)';
        }, 100);
    }
    
    handleKeyboard(e) {
        // 如果正在输入，不处理快捷键
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.prevCard();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextCard();
                break;
            case ' ':
            case 'Enter':
                e.preventDefault();
                this.showRandomCard();
                break;

            case 'Escape':
                this.closeSidebar();
                break;
        }
    }
    
    openSidebar() {
        this.elements.sidebar.classList.add('open');
        this.elements.menuToggle.setAttribute('aria-expanded', 'true');
    }
    
    closeSidebar() {
        this.elements.sidebar.classList.remove('open');
        this.elements.menuToggle.setAttribute('aria-expanded', 'false');
    }
    
    showHoppeInfo() {
        this.elements.hoppeInfoModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    closeHoppeInfo() {
        this.elements.hoppeInfoModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    showToast(message, type = 'info') {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        // 加快弹窗消失速度，特别是对于随机抽取提示
        const timeout = message.includes('随机抽取') ? 1500 : 3000;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, timeout);
    }
    
    hideLoading() {
        this.elements.loading.classList.add('hidden');
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new HoppeFlashcards();
});

// 错误处理
window.addEventListener('error', (e) => {
    console.error('页面错误:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
});

// 导出给其他脚本使用（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HoppeFlashcards;
}