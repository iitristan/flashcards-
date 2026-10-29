'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Edit3, Tag, Layers, Check, Search, AlertCircle, CheckCircle2, BookOpen, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Deck, Flashcard, DeckCategory, getCardProgressInfo } from '@/types';
import { toast } from 'sonner';
import { cleanRawHtml } from '@/components/study/FormattedCardText';
import { CompactCardText } from '@/components/study/CompactCardText';
import { cleanOptionLabel } from '@/lib/importers/anki/ankiConverter';

interface DeckManagerProps {
  initialDeck?: Deck | null;
  defaultCategory?: DeckCategory;
  onSaveDeck: (deckData: {
    title: string;
    description: string;
    category: DeckCategory;
    icon: string;
    color: string;
    tags: string[];
  }, cards?: Partial<Flashcard>[]) => Promise<Deck>;
  onUpdateDeck?: (id: string, updates: Partial<Deck>) => Promise<void>;
  onAddCard?: (deckId: string, card: Omit<Flashcard, 'id' | 'deckId' | 'sm2' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateCard?: (deckId: string, cardId: string, updates: Partial<Flashcard>) => Promise<void>;
  onDeleteCard?: (deckId: string, cardId: string) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES: DeckCategory[] = [
  'Clinical Nutrition',
  'Nutritional Biochemistry',
  'Food Service Systems',
  'Public Health & Community',
  'Maternal & Child Nutrition',
  'General Dietetics'
];

const ICONS = [
  { id: 'Stethoscope', label: 'Clinical', icon: '🩺' },
  { id: 'Sparkles', label: 'Biochem', icon: '✨' },
  { id: 'Calculator', label: 'Calculations', icon: '🧮' },
  { id: 'BookOpen', label: 'General', icon: '📖' },
  { id: 'Apple', label: 'Dietetics', icon: '🍎' },
];

const COLORS = [
  '#7FA98B', // Matcha
  '#FF9A76', // Peach
  '#F38BA0', // Strawberry
  '#D4A373', // Vanilla
  '#76B39D', // Slate green
  '#8B5CF6', // Purple
];

export const DeckManager: React.FC<DeckManagerProps> = ({
  initialDeck,
  defaultCategory,
  onSaveDeck,
  onUpdateDeck,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onClose
}) => {
  // Deck form state
  const [title, setTitle] = useState(initialDeck?.title || '');
  const [description, setDescription] = useState(initialDeck?.description || '');
  const [category, setCategory] = useState<DeckCategory>(initialDeck?.category || defaultCategory || 'Clinical Nutrition');
  const [icon, setIcon] = useState(initialDeck?.icon || 'Stethoscope');
  const [color, setColor] = useState(initialDeck?.color || '#7FA98B');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialDeck?.tags || ['MNT']);

  // Card editor state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardRationale, setCardRationale] = useState('');
  const [cardTags, setCardTags] = useState<string[]>([]);
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [isAddingNewCard, setIsAddingNewCard] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  type CardFilterType = 'all' | 'missing-rationale' | 'has-rationale' | 'new' | 'learning' | 'developing' | 'mastered' | 'due';
  type CardSortType = 'default' | 'stage' | 'mastered-first' | 'alpha';
  const [cardFilter, setCardFilter] = useState<CardFilterType>('all');
  const [cardSort, setCardSort] = useState<CardSortType>('default');

  // Pagination state for Manage Cards
  const [cardPage, setCardPage] = useState(1);
  const [cardPageSize, setCardPageSize] = useState(10);

  // Reset to page 1 whenever filters, search, sort, or page size change
  useEffect(() => {
    setCardPage(1);
  }, [cardSearchQuery, cardFilter, cardSort, cardPageSize]);

  // Inline rationale editing state
  const [inlineEditingCardId, setInlineEditingCardId] = useState<string | null>(null);
  const [inlineRationaleText, setInlineRationaleText] = useState('');
  const [isSavingRationale, setIsSavingRationale] = useState(false);

  // Local card state for instant UI updates
  const [localCards, setLocalCards] = useState<Flashcard[]>(initialDeck?.cards || []);

  useEffect(() => {
    if (initialDeck?.cards) {
      setLocalCards(initialDeck.cards);
    }
  }, [initialDeck?.cards]);

  const startInlineEditRationale = (card: Flashcard) => {
    setInlineEditingCardId(card.id);
    setInlineRationaleText(card.rationale || '');
  };

  const cancelInlineRationale = () => {
    setInlineEditingCardId(null);
    setInlineRationaleText('');
  };

  const handleSaveInlineRationale = async (cardId: string) => {
    if (!initialDeck || !onUpdateCard) return;
    setIsSavingRationale(true);
    try {
      const trimmed = inlineRationaleText.trim();
      await onUpdateCard(initialDeck.id, cardId, { rationale: trimmed });
      setLocalCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, rationale: trimmed } : c))
      );
      if (initialDeck.cards) {
        const c = initialDeck.cards.find((c) => c.id === cardId);
        if (c) c.rationale = trimmed;
      }
      setInlineEditingCardId(null);
      setInlineRationaleText('');
      toast.success(trimmed ? 'Rationale updated successfully!' : 'Rationale cleared');
    } catch {
      toast.error('Failed to save rationale');
    } finally {
      setIsSavingRationale(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'info' | 'cards'>('info');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const resetCardForm = () => {
    setEditingCardId(null);
    setCardFront('');
    setCardBack('');
    setCardRationale('');
    setCardTags([]);
    setOption1('');
    setOption2('');
    setOption3('');
    setIsAddingNewCard(false);
  };

  const startEditCard = (card: Flashcard) => {
    setEditingCardId(card.id);
    setCardFront(card.front);
    setCardBack(card.back);
    setCardRationale(card.rationale || '');
    setCardTags(card.tags || []);
    
    // Fill other options
    const otherOpts = (card.options || []).filter(o => o !== card.back);
    setOption1(otherOpts[0] || '');
    setOption2(otherOpts[1] || '');
    setOption3(otherOpts[2] || '');

    setIsAddingNewCard(true);
  };

  const handleSaveCard = async () => {
    if (!cardFront.trim() || !cardBack.trim()) {
      toast.error('Please enter both a Question (Front) and Answer (Back)');
      return;
    }

    const options = [
      cardBack.trim(),
      option1.trim() || 'Option B',
      option2.trim() || 'Option C',
      option3.trim() || 'Option D'
    ];

    if (initialDeck && onAddCard && onUpdateCard) {
      if (editingCardId) {
        await onUpdateCard(initialDeck.id, editingCardId, {
          front: cardFront.trim(),
          back: cardBack.trim(),
          rationale: cardRationale.trim(),
          tags: cardTags.length > 0 ? cardTags : tags,
          options
        });
        setLocalCards((prev) =>
          prev.map((c) =>
            c.id === editingCardId
              ? {
                  ...c,
                  front: cardFront.trim(),
                  back: cardBack.trim(),
                  rationale: cardRationale.trim(),
                  tags: cardTags.length > 0 ? cardTags : tags,
                  options
                }
              : c
          )
        );
        toast.success('Card updated!');
      } else {
        await onAddCard(initialDeck.id, {
          front: cardFront.trim(),
          back: cardBack.trim(),
          rationale: cardRationale.trim(),
          tags: cardTags.length > 0 ? cardTags : tags,
          options,
          difficulty: 'medium',
          leitnerBox: 1
        });
        toast.success('Card added to deck!');
      }
    }
    resetCardForm();
  };

  const handleSaveDeck = async () => {
    if (!title.trim()) {
      toast.error('Deck title is required');
      return;
    }

    if (initialDeck && onUpdateDeck) {
      await onUpdateDeck(initialDeck.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        icon,
        color,
        tags
      });
      toast.success('Deck details updated!');
      onClose();
    } else {
      await onSaveDeck({
        title: title.trim(),
        description: description.trim(),
        category,
        icon,
        color,
        tags
      });
      toast.success('New deck created!');
      onClose();
    }
  };

  // Close modal on Escape key when not actively typing in an inline sub-form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inlineEditingCardId) {
          setInlineEditingCardId(null);
        } else if (isAddingNewCard) {
          setIsAddingNewCard(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, inlineEditingCardId, isAddingNewCard]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-manager-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--modal-shadow)] overflow-hidden my-3 sm:my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg shadow-xs shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="deck-manager-title" className="text-sm sm:text-base font-black text-[var(--text-main)] truncate">
                {initialDeck ? `Edit: ${initialDeck.title}` : 'Create New Reviewer Deck'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)] truncate">
                {initialDeck ? `${initialDeck.cards.length} cards in this deck` : 'Set up your subject and flashcards'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close deck manager modal"
            className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch for existing deck */}
        {initialDeck && (
          <div
            role="tablist"
            aria-label="Deck management tabs"
            className="flex border-b border-[var(--border-subtle)] px-4 sm:px-6 pt-2 bg-[var(--bg-surface-subtle)]/50 overflow-x-auto scrollbar-none"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'info'}
              onClick={() => setActiveTab('info')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'info'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Deck Settings
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'cards'}
              onClick={() => setActiveTab('cards')}
              className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'cards'
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <span>Manage Cards</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--primary-light)] text-[var(--primary)] font-bold">
                {initialDeck.cards.length}
              </span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-3.5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-4 sm:space-y-6">
          {activeTab === 'info' ? (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1.5">
                  Deck Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Clinical Nutrition & MNT"
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-sm font-semibold text-[var(--text-main)]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Renal nutrition, enteral/parenteral feeding, and diabetes MNT formulas."
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-sm text-[var(--text-main)] resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1.5">
                  Subject Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DeckCategory)}
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-sm font-semibold text-[var(--text-main)]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Icons & Colors */}
              <div className="grid grid-cols-2 gap-4">
                {/* Icon selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1.5">
                    Icon Mascot
                  </label>
                  <div className="flex gap-2">
                    {ICONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center text-lg transition-all ${
                          icon === item.id
                            ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-surface)]'
                        }`}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color theme */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1.5">
                    Deck Color
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          color === c ? 'scale-110 border-black dark:border-white ring-2 ring-emerald-300' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-subtle)] mb-1.5">
                  Tags & Subtopics
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="e.g. CKD, Vitamins, Atwater"
                    className="flex-1 px-4 py-2 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] focus:border-[var(--primary)] outline-none text-xs font-semibold text-[var(--text-main)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 rounded-2xl bg-[var(--bg-surface-subtle)] text-xs font-bold text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--border-color)]"
                  >
                    Add Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                    >
                      <Tag className="w-3 h-3 text-[var(--primary)]" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-[var(--text-subtle)] hover:text-rose-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Cards Tab for existing deck */
            <div className="space-y-6">
              {!isAddingNewCard ? (
                <div className="space-y-4">
                  {/* Search, Sort, and Add Card Controls Bar */}
                  <div className="space-y-3 p-3 sm:p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                    {/* Row 1: Search, Sort Dropdown, and Add Flashcard */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      {/* Search Input */}
                      <div className="relative flex-1 min-w-0">
                        <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={cardSearchQuery}
                          onChange={(e) => setCardSearchQuery(e.target.value)}
                          placeholder="Search cards by question, answer, tag..."
                          className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] focus:border-[var(--primary)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none transition-colors font-medium shadow-2xs"
                        />
                        {cardSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCardSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)] p-0.5 cursor-pointer"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Sort Selector Dropdown */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="relative w-full sm:w-auto">
                          <select
                            value={cardSort}
                            onChange={(e) => setCardSort(e.target.value as CardSortType)}
                            aria-label="Sort flashcards"
                            className="w-full sm:w-auto pl-7 pr-7 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] outline-none cursor-pointer focus:border-[var(--primary)] shadow-2xs appearance-none"
                          >
                            <option value="default">Default Order</option>
                            <option value="stage">Unseen First</option>
                            <option value="mastered-first">Mastered First</option>
                            <option value="alpha">Alphabetical (A–Z)</option>
                          </select>
                          <ArrowUpDown className="w-3 h-3 text-[var(--primary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <span className="text-[10px] text-[var(--text-subtle)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">▼</span>
                        </div>
                      </div>

                      {/* Add Flashcard Button */}
                      <button
                        onClick={() => {
                          resetCardForm();
                          setIsAddingNewCard(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs flex-shrink-0 cursor-pointer active:scale-95 min-h-[34px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Flashcard</span>
                      </button>
                    </div>

                    {/* Row 2: Filter Chips with responsive wrapping */}
                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="font-bold text-[var(--text-subtle)] flex items-center gap-1 mr-1 shrink-0">
                          <Filter className="w-3 h-3 text-[var(--primary)]" /> Filter:
                        </span>
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'missing-rationale', label: '⚠️ Missing Rationale' },
                          { id: 'has-rationale', label: '💡 Has Rationale' },
                          { id: 'new', label: '🆕 Unseen' },
                          { id: 'learning', label: '🔄 Learning' },
                          { id: 'developing', label: '📈 Developing' },
                          { id: 'mastered', label: '🏆 Mastered' },
                          { id: 'due', label: '⏰ Due' },
                        ].map((flt) => (
                          <button
                            key={flt.id}
                            type="button"
                            onClick={() => setCardFilter(flt.id as CardFilterType)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              cardFilter === flt.id
                                ? 'bg-[var(--primary)] text-white shadow-xs'
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]'
                            }`}
                          >
                            {flt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cards List / Empty State */}
                  {(() => {
                    const allCards = localCards.length > 0 ? localCards : (initialDeck?.cards || []);
                    const q = cardSearchQuery.trim().toLowerCase();
                    const totalMissingRationale = allCards.filter(c => !c.rationale || !c.rationale.trim()).length;

                    // Step 1: Text search
                    let processed = q
                      ? allCards.filter(
                          (c) =>
                            (c.front || '').toLowerCase().includes(q) ||
                            (c.back || '').toLowerCase().includes(q) ||
                            (c.rationale || '').toLowerCase().includes(q) ||
                            (c.tags || []).some((t) => t.toLowerCase().includes(q))
                        )
                      : [...allCards];

                    // Step 2: Stage & Rationale Filter
                    if (cardFilter === 'missing-rationale') {
                      processed = processed.filter((c) => !c.rationale || !c.rationale.trim());
                    } else if (cardFilter === 'has-rationale') {
                      processed = processed.filter((c) => Boolean(c.rationale && c.rationale.trim()));
                    } else if (cardFilter !== 'all') {
                      processed = processed.filter((c) => {
                        const info = getCardProgressInfo(c);
                        if (cardFilter === 'due') return info.isDue;
                        return info.stage === cardFilter;
                      });
                    }

                    // Step 3: Sort
                    if (cardSort === 'stage') {
                      const stageRank = { new: 0, learning: 1, developing: 2, mastered: 3 };
                      processed.sort((a, b) => {
                        const sA = stageRank[getCardProgressInfo(a).stage];
                        const sB = stageRank[getCardProgressInfo(b).stage];
                        return sA - sB;
                      });
                    } else if (cardSort === 'mastered-first') {
                      const stageRank = { mastered: 0, developing: 1, learning: 2, new: 3 };
                      processed.sort((a, b) => {
                        const sA = stageRank[getCardProgressInfo(a).stage];
                        const sB = stageRank[getCardProgressInfo(b).stage];
                        return sA - sB;
                      });
                    } else if (cardSort === 'alpha') {
                      processed.sort((a, b) => (a.front || '').localeCompare(b.front || ''));
                    }

                    if (processed.length === 0) {
                      return (
                        <div className="p-8 rounded-2xl bg-[var(--bg-surface-subtle)] border border-dashed border-[var(--border-color)] text-center space-y-2">
                          <p className="text-xs font-medium text-[var(--text-muted)]">
                            {q || cardFilter !== 'all'
                              ? 'No flashcards match the selected search and filter criteria.'
                              : 'No flashcards in this deck yet.'}
                          </p>
                          {(q || cardFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setCardSearchQuery('');
                                setCardFilter('all');
                              }}
                              className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                            >
                              Reset filters & search
                            </button>
                          )}
                        </div>
                      );
                    }

                    // Step 4: Pagination calculations
                    const totalCards = processed.length;
                    const totalPages = Math.max(1, Math.ceil(totalCards / cardPageSize));
                    const safeCurrentPage = Math.min(Math.max(1, cardPage), totalPages);
                    const startIndex = (safeCurrentPage - 1) * cardPageSize;
                    const endIndex = Math.min(startIndex + cardPageSize, totalCards);
                    const paginatedCards = processed.slice(startIndex, endIndex);

                    const getPageNumbers = () => {
                      if (totalPages <= 5) {
                        return Array.from({ length: totalPages }, (_, i) => i + 1);
                      }
                      if (safeCurrentPage <= 3) {
                        return [1, 2, 3, '...', totalPages];
                      }
                      if (safeCurrentPage >= totalPages - 2) {
                        return [1, '...', totalPages - 2, totalPages - 1, totalPages];
                      }
                      return [1, '...', safeCurrentPage, '...', totalPages];
                    };

                    return (
                      <div className="space-y-3">
                        {/* Summary Header */}
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] px-1 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>
                              Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                              <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                            </span>
                            {totalMissingRationale > 0 && (
                              <button
                                type="button"
                                onClick={() => setCardFilter(cardFilter === 'missing-rationale' ? 'all' : 'missing-rationale')}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer transition-colors"
                                title="Click to filter cards missing rationales"
                              >
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                <span>{totalMissingRationale} missing rationale</span>
                              </button>
                            )}
                          </div>
                          {cardFilter !== 'all' && (
                            <span className="text-[10px] font-bold text-[var(--primary)]">
                              Filter active: {cardFilter}
                            </span>
                          )}
                        </div>

                        {/* Paginated Cards List */}
                        <div className="space-y-3">
                          {paginatedCards.map((card, idx) => {
                            const prog = getCardProgressInfo(card);
                            const hasRationale = Boolean(card.rationale && card.rationale.trim());
                            const isEditingThisRationale = inlineEditingCardId === card.id;
                            const globalCardIndex = startIndex + idx + 1;

                            return (
                              <div
                                key={card.id}
                                className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex flex-col gap-2.5 group hover:border-[var(--primary)]/40 transition-all"
                              >
                                {/* Card Header Row: Badge & Index on left, Edit & Delete Actions on right */}
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="w-5 h-5 rounded-lg bg-[var(--border-color)] text-[10px] font-bold flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
                                      {globalCardIndex}
                                    </span>
                                    {/* Progression Stage Badge */}
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                                        prog.stage === 'mastered'
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                          : prog.stage === 'developing'
                                          ? 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                                          : prog.stage === 'learning'
                                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                          : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                      }`}
                                    >
                                      {prog.stageLabel}
                                      {prog.stage !== 'new' && ` · Box ${prog.leitnerBox}`}
                                      {prog.totalReviews > 0 && ` (${prog.totalReviews} rev)`}
                                    </span>

                                    {/* Rationale Status Indicator Badge */}
                                    {hasRationale ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Rationale Included</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                        <span>No rationale</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => startEditCard(card)}
                                      className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-[var(--primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                                      title="Edit full card"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    {onDeleteCard && initialDeck && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await onDeleteCard(initialDeck.id, card.id);
                                          setLocalCards(prev => prev.filter(c => c.id !== card.id));
                                        }}
                                        className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-rose-500 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                                        title="Delete card"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Question (Front) - Full width, clean wrap, compact images */}
                                <div className="text-xs sm:text-sm font-bold text-[var(--text-main)] leading-snug break-words [overflow-wrap:anywhere]">
                                  <CompactCardText content={card.front} />
                                </div>

                                {/* Multiple Choice Options (if present) */}
                                {card.options && card.options.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                                    {card.options.map((opt, optIdx) => {
                                      const isKey =
                                        cleanOptionLabel(opt).trim().toLowerCase() ===
                                        cleanRawHtml(card.back).trim().toLowerCase();
                                      return (
                                        <div
                                          key={optIdx}
                                          className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-start gap-1.5 ${
                                            isKey
                                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold'
                                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                                          }`}
                                        >
                                          <span className="font-bold text-[10px] text-[var(--text-subtle)] shrink-0 mt-0.5">
                                            {String.fromCharCode(65 + optIdx)}.
                                          </span>
                                          <CompactCardText
                                            content={opt}
                                            className="break-words leading-relaxed flex-1 min-w-0"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Answer (Back / Key) - Full width, clean wrap */}
                                <div className="text-xs font-semibold text-[var(--primary)] break-words [overflow-wrap:anywhere] leading-relaxed flex items-baseline gap-1">
                                  <span className="shrink-0 font-bold">Key:</span>
                                  <CompactCardText content={card.back} className="break-words" />
                                </div>

                                {/* RATIONALE SECTION */}
                                {isEditingThisRationale ? (
                                  <div className="mt-1 w-full">
                                    <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--primary)] space-y-2 shadow-xs">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
                                          <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                                          <span>{hasRationale ? 'Edit Rationale' : 'Add Missing Rationale'}</span>
                                        </label>
                                        <span className="text-[10px] text-[var(--text-muted)]">Saved directly to reviewer</span>
                                      </div>
                                      <textarea
                                        value={inlineRationaleText}
                                        onChange={(e) => setInlineRationaleText(e.target.value)}
                                        placeholder="Enter clinical rationale, reasoning, or key board exam concept..."
                                        rows={3}
                                        className="w-full p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] resize-y leading-relaxed font-normal"
                                        autoFocus
                                      />
                                      <div className="flex items-center justify-end gap-2 pt-0.5">
                                        <button
                                          type="button"
                                          onClick={cancelInlineRationale}
                                          disabled={isSavingRationale}
                                          className="px-3 py-1 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveInlineRationale(card.id)}
                                          disabled={isSavingRationale}
                                          className="px-3 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>{isSavingRationale ? 'Saving...' : 'Save Rationale'}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : hasRationale ? (
                                  <div className="mt-1 w-full">
                                    <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1">
                                          <BookOpen className="w-3 h-3" />
                                          Rationale:
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => startInlineEditRationale(card)}
                                          className="text-[10px] font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                          title="Edit rationale inline"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>Edit Rationale</span>
                                        </button>
                                      </div>
                                      <div className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-normal break-words [overflow-wrap:anywhere]">
                                        <CompactCardText content={card.rationale} />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-1 w-full">
                                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/30">
                                      <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 min-w-0">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="text-[11px] font-semibold break-words">No rationale provided for this card</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => startInlineEditRationale(card)}
                                        className="px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-xs font-bold transition-all inline-flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-95 shrink-0 self-start xs:self-auto min-h-[30px]"
                                        title="Add rationale without opening card"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Rationale</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination Controls Bar at the bottom */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2.5 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] mt-4 w-full">
                          {/* Result Range & Configurable Page Size Selector */}
                          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                            <span>
                              Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                              <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                            </span>

                            <div className="flex items-center gap-1.5 text-[11px] border-l border-[var(--border-color)] pl-2.5">
                              <span className="text-[var(--text-subtle)] font-medium">Per page:</span>
                              <select
                                value={cardPageSize}
                                onChange={(e) => {
                                  setCardPageSize(Number(e.target.value));
                                  setCardPage(1);
                                }}
                                aria-label="Cards per page"
                                className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-bold outline-none cursor-pointer focus:border-[var(--primary)]"
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                          </div>

                          {/* Navigation Buttons */}
                          {totalPages > 1 && (
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              <button
                                type="button"
                                onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                                disabled={safeCurrentPage === 1}
                                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 transition-colors"
                                title="Previous page"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">Prev</span>
                              </button>

                              <div className="flex items-center gap-1 mx-1">
                                {getPageNumbers().map((p, pIdx) =>
                                  p === '...' ? (
                                    <span key={`dots-${pIdx}`} className="px-1 text-[var(--text-subtle)] text-xs">…</span>
                                  ) : (
                                    <button
                                      key={`page-${p}`}
                                      type="button"
                                      onClick={() => setCardPage(Number(p))}
                                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        safeCurrentPage === p
                                          ? 'bg-[var(--primary)] text-white shadow-xs'
                                          : 'border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                                      }`}
                                    >
                                      {p}
                                    </button>
                                  )
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => setCardPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safeCurrentPage === totalPages}
                                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 transition-colors"
                                title="Next page"
                              >
                                <span className="hidden xs:inline">Next</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Card Edit Form */
                <div className="space-y-4 p-5 rounded-3xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                    <h3 className="text-sm font-bold text-[var(--text-main)]">
                      {editingCardId ? 'Edit Flashcard' : 'Add New Flashcard'}
                    </h3>
                    <button
                      onClick={resetCardForm}
                      className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Question */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                      Question / Concept (Front) *
                    </label>
                    <textarea
                      rows={2}
                      value={cardFront}
                      onChange={(e) => setCardFront(e.target.value)}
                      placeholder="e.g. What is the standard protein recommendation for Stage 4 CKD?"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* Answer */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                      Correct Answer / Key (Back) *
                    </label>
                    <input
                      type="text"
                      value={cardBack}
                      onChange={(e) => setCardBack(e.target.value)}
                      placeholder="e.g. 0.6 to 0.8 g/kg body weight/day"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-bold text-[var(--primary)] outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* Rationale */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-subtle)] mb-1">
                      Clinical / Exam Rationale (Explanation)
                    </label>
                    <textarea
                      rows={2}
                      value={cardRationale}
                      onChange={(e) => setCardRationale(e.target.value)}
                      placeholder="e.g. Low protein reduces uremic toxin buildup and spares nephron workload..."
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  {/* Multiple choice distractor options */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--text-subtle)]">
                      3 Distractor Options (for Multiple Choice Mode)
                    </label>
                    <input
                      type="text"
                      value={option1}
                      onChange={(e) => setOption1(e.target.value)}
                      placeholder="Distractor 1 (e.g. 1.2 to 1.4 g/kg/day)"
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)]"
                    />
                    <input
                      type="text"
                      value={option2}
                      onChange={(e) => setOption2(e.target.value)}
                      placeholder="Distractor 2 (e.g. 1.5 to 2.0 g/kg/day)"
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)]"
                    />
                    <input
                      type="text"
                      value={option3}
                      onChange={(e) => setOption3(e.target.value)}
                      placeholder="Distractor 3 (e.g. 0.3 to 0.5 g/kg/day)"
                      className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resetCardForm}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCard}
                      className="px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] shadow-xs"
                    >
                      {editingCardId ? 'Save Changes' : 'Add Card'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/40">
          {activeTab === 'info' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeck}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{initialDeck ? 'Save Deck' : 'Create Deck'}</span>
              </button>
            </>
          ) : (
            <>
              <p className="text-[11px] text-[var(--text-muted)] hidden xs:block">
                All card changes and rationales are saved automatically.
              </p>
              <div className="flex items-center justify-end gap-2 w-full xs:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full xs:w-auto px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done / Close</span>
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
