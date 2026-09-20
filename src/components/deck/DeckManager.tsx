'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Edit3, Tag, Layers, Check, Search } from 'lucide-react';
import { Deck, Flashcard, DeckCategory } from '@/types';
import { toast } from 'sonner';
import { cleanRawHtml } from '@/components/study/FormattedCardText';

interface DeckManagerProps {
  initialDeck?: Deck | null;
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
  const [category, setCategory] = useState<DeckCategory>(initialDeck?.category || 'Clinical Nutrition');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-manager-title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl rounded-3xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shadow-[var(--modal-shadow)] overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-xs"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="deck-manager-title" className="text-lg font-black text-[var(--text-main)]">
                {initialDeck ? `Edit: ${initialDeck.title}` : 'Create New Reviewer Deck'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {initialDeck ? `${initialDeck.cards.length} cards in this deck` : 'Set up your subject and flashcards'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close deck manager modal"
            className="p-2 rounded-2xl text-[var(--text-subtle)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch for existing deck */}
        {initialDeck && (
          <div
            role="tablist"
            aria-label="Deck management tabs"
            className="flex border-b border-[var(--border-subtle)] px-6 pt-2 bg-[var(--bg-surface-subtle)]/50"
          >
            <button
              role="tab"
              aria-selected={activeTab === 'info'}
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
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
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
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
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
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
                  {/* Search and Add Card Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={cardSearchQuery}
                        onChange={(e) => setCardSearchQuery(e.target.value)}
                        placeholder="Search cards by question, answer, tag..."
                        className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] focus:border-[var(--primary)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-subtle)] outline-none transition-colors font-medium"
                      />
                      {cardSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCardSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)] p-0.5"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Add Flashcard Button */}
                    <button
                      onClick={() => {
                        resetCardForm();
                        setIsAddingNewCard(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[var(--primary-hover)] transition-colors shadow-xs flex-shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Flashcard</span>
                    </button>
                  </div>

                  {/* Cards List / Empty State */}
                  {(() => {
                    const allCards = initialDeck?.cards || [];
                    const q = cardSearchQuery.trim().toLowerCase();
                    const filtered = q
                      ? allCards.filter(
                          (c) =>
                            (c.front || '').toLowerCase().includes(q) ||
                            (c.back || '').toLowerCase().includes(q) ||
                            (c.rationale || '').toLowerCase().includes(q) ||
                            (c.tags || []).some((t) => t.toLowerCase().includes(q))
                        )
                      : allCards;

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 rounded-2xl bg-[var(--bg-surface-subtle)] border border-dashed border-[var(--border-color)] text-center space-y-2">
                          <p className="text-xs font-medium text-[var(--text-muted)]">
                            {q
                              ? `No flashcards found matching "${cardSearchQuery}".`
                              : 'No flashcards in this deck yet.'}
                          </p>
                          {q && (
                            <button
                              type="button"
                              onClick={() => setCardSearchQuery('')}
                              className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                            >
                              Clear search query
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {q && (
                          <div className="text-[11px] font-semibold text-[var(--text-muted)] px-1">
                            Showing {filtered.length} of {allCards.length} cards
                          </div>
                        )}
                        <div className="space-y-2.5">
                          {filtered.map((card, idx) => (
                            <div
                              key={card.id}
                              className="p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex items-start justify-between gap-3 group"
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-lg bg-[var(--border-color)] text-[10px] font-bold flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <h4 className="text-xs font-bold text-[var(--text-main)] truncate">
                                    {cleanRawHtml(card.front)}
                                  </h4>
                                </div>
                                <p className="text-xs font-semibold text-[var(--primary)] line-clamp-1 pl-7">
                                  Key: {cleanRawHtml(card.back)}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => startEditCard(card)}
                                  className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-[var(--primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                                  title="Edit card"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {onDeleteCard && initialDeck && (
                                  <button
                                    onClick={() => onDeleteCard(initialDeck.id, card.id)}
                                    className="p-1.5 rounded-xl text-[var(--text-subtle)] hover:text-rose-500 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                                    title="Delete card"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
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
        {activeTab === 'info' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]/30">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDeck}
              className="px-6 py-2.5 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{initialDeck ? 'Save Deck' : 'Create Deck'}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
