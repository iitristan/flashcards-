'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Tag,
  Stethoscope,
  Globe,
  UtensilsCrossed,
  Heart,
  Apple,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useNutriStore } from '@/lib/store/useNutriStore';
import {
  CardGroupFilterConfig,
  CardGroupFilterItem,
  CardSortOption,
  CardFilterOption,
  Flashcard,
  getCardProgressInfo
} from '@/types';
import { resolveCardSubject } from '@/lib/services/boardReadinessService';
import { cleanRawHtml } from '@/components/study/FormattedCardText';
import { CompactCardText } from '@/components/study/CompactCardText';
import { cleanOptionLabel } from '@/lib/importers/anki/ankiConverter';
import { toast } from 'sonner';

export const CardFilterManager: React.FC = () => {
  const {
    decks,
    cardGroupFilters,
    updateGroupFilterConfig,
    updatePracticeAreaName,
    deletePracticeArea,
    assignCardToPracticeArea,
    unassignCardFromPracticeArea,
    addGroupFilterItem,
    removeGroupFilterItem,
    toggleGroupFilterItem,
    reorderGroupFilterItems,
    resetGroupFilterConfig,
    resetAllGroupFilters,
    updateCard
  } = useNutriStore();

  const groupKeys = useMemo(() => Object.keys(cardGroupFilters), [cardGroupFilters]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupKeys[0] || 'nbcd');

  // Practice area renaming state
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  // Destructive action confirmation modals
  const [deleteGroupModal, setDeleteGroupModal] = useState<CardGroupFilterConfig | null>(null);
  const [deleteFilterModal, setDeleteFilterModal] = useState<CardGroupFilterItem | null>(null);

  // New filter input state
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [newFilterTag, setNewFilterTag] = useState('');

  // Editing existing filter state
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTag, setEditTag] = useState('');

  // Search filter inside assigned/unassigned cards
  const [cardSearch, setCardSearch] = useState('');

  // Card tagging modal/popover state
  const [taggingCardId, setTaggingCardId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Inline rationale editing state
  const [inlineEditingCardId, setInlineEditingCardId] = useState<string | null>(null);
  const [inlineRationaleText, setInlineRationaleText] = useState('');
  const [isSavingRationale, setIsSavingRationale] = useState(false);

  // Pagination state for cards preview
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Ensure selectedGroupId is valid
  useEffect(() => {
    if (selectedGroupId !== 'unassigned' && !cardGroupFilters[selectedGroupId]) {
      setSelectedGroupId(groupKeys[0] || 'unassigned');
    }
  }, [selectedGroupId, cardGroupFilters, groupKeys]);

  const activeGroup: CardGroupFilterConfig | undefined =
    selectedGroupId !== 'unassigned' ? cardGroupFilters[selectedGroupId] : undefined;

  // Map icons
  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case 'Stethoscope':
        return <Stethoscope className="w-4 h-4" />;
      case 'Globe':
        return <Globe className="w-4 h-4" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-4 h-4" />;
      case 'Heart':
        return <Heart className="w-4 h-4" />;
      case 'Apple':
        return <Apple className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  // Helper: check if a card belongs to a specific group
  const isCardInGroup = (card: Flashcard, deckCategory: string, group: CardGroupFilterConfig): boolean => {
    if (card.unassigned) return false;
    if (card.practiceAreaId) {
      return card.practiceAreaId === group.id;
    }
    if (group.ndleSubject) {
      const resolved = resolveCardSubject(card, deckCategory);
      if (resolved === group.ndleSubject) {
        return true;
      }
    } else if (group.category) {
      if (deckCategory === group.category) {
        return true;
      } else if ((card.tags || []).some(t => t.toLowerCase() === group.category?.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  // Helper: check if a card belongs to ANY active practice area
  const isCardAssigned = (card: Flashcard, deckCategory: string): boolean => {
    if (card.unassigned) return false;
    if (card.practiceAreaId) {
      return groupKeys.includes(card.practiceAreaId);
    }
    return groupKeys.some(k => cardGroupFilters[k] && isCardInGroup(card, deckCategory, cardGroupFilters[k]));
  };

  // 1. Gather all cards that belong to active group
  const allGroupCards: Array<{ card: Flashcard; deckTitle: string; deckCategory: string; deckId: string }> = useMemo(() => {
    if (!activeGroup) return [];
    const list: Array<{ card: Flashcard; deckTitle: string; deckCategory: string; deckId: string }> = [];

    for (const deck of decks) {
      for (const card of deck.cards || []) {
        if (isCardInGroup(card, deck.category, activeGroup)) {
          list.push({
            card,
            deckTitle: deck.title,
            deckCategory: deck.category,
            deckId: deck.id
          });
        }
      }
    }
    return list;
  }, [decks, activeGroup]);

  // 2. Gather all Unassigned cards
  const unassignedCards: Array<{ card: Flashcard; deckTitle: string; deckCategory: string; deckId: string }> = useMemo(() => {
    const list: Array<{ card: Flashcard; deckTitle: string; deckCategory: string; deckId: string }> = [];
    for (const deck of decks) {
      for (const card of deck.cards || []) {
        if (!isCardAssigned(card, deck.category)) {
          list.push({
            card,
            deckTitle: deck.title,
            deckCategory: deck.category,
            deckId: deck.id
          });
        }
      }
    }
    return list;
  }, [decks, groupKeys, cardGroupFilters]);

  // Helper to test if a card matches a filter item
  const cardMatchesFilter = (card: Flashcard, filter: CardGroupFilterItem): boolean => {
    const q = filter.tag.trim().toLowerCase();
    if (!q) return true;
    const cardTags = (card.tags || []).map(t => t.toLowerCase());
    if (cardTags.some(t => t.includes(q) || q.includes(t))) return true;
    if ((card.front || '').toLowerCase().includes(q)) return true;
    if ((card.back || '').toLowerCase().includes(q)) return true;
    if ((card.rationale || '').toLowerCase().includes(q)) return true;
    return false;
  };

  // Calculate card counts per filter item in active group
  const filterCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeGroup) return map;

    for (const f of activeGroup.filters) {
      let count = 0;
      for (const item of allGroupCards) {
        if (cardMatchesFilter(item.card, f)) {
          count++;
        }
      }
      map.set(f.id, count);
    }
    return map;
  }, [activeGroup, allGroupCards]);

  // 3. Filter & Sort cards according to active group or unassigned mode
  const displayCards = useMemo(() => {
    if (selectedGroupId === 'unassigned') {
      let result = [...unassignedCards];
      const q = cardSearch.trim().toLowerCase();
      if (q) {
        result = result.filter(item =>
          (item.card.front || '').toLowerCase().includes(q) ||
          (item.card.back || '').toLowerCase().includes(q) ||
          (item.card.rationale || '').toLowerCase().includes(q) ||
          (item.card.tags || []).some(t => t.toLowerCase().includes(q))
        );
      }
      return result;
    }

    if (!activeGroup) return [];
    let result = [...allGroupCards];

    // Filter by active group sub-filter tags
    const enabledFilters = activeGroup.filters.filter(f => f.enabled);
    if (activeGroup.filters.length > 0) {
      if (enabledFilters.length === 0) {
        return [];
      } else if (enabledFilters.length < activeGroup.filters.length) {
        result = result.filter(item => enabledFilters.some(f => cardMatchesFilter(item.card, f)));
      }
    }

    // Filter by stage filter (progress)
    const stage = activeGroup.stageFilter;
    if (stage !== 'all') {
      const now = new Date();
      if (stage === 'unseen') {
        result = result.filter(item => !item.card.lastReviewedAt || (item.card.sm2?.repetitions || 0) === 0);
      } else if (stage === 'learning') {
        result = result.filter(item => (item.card.sm2?.repetitions || 0) > 0 && (item.card.sm2?.interval || 0) < 4);
      } else if (stage === 'developing') {
        result = result.filter(item => (item.card.sm2?.interval || 0) >= 4 && (item.card.sm2?.interval || 0) < 21);
      } else if (stage === 'mastered') {
        result = result.filter(item => (item.card.sm2?.interval || 0) >= 21 || (item.card.sm2?.repetitions || 0) >= 4);
      } else if (stage === 'due') {
        result = result.filter(item => !item.card.lastReviewedAt || new Date(item.card.sm2?.dueDate || 0) <= now);
      } else if (stage === 'wrong') {
        result = result.filter(item => item.card.lastReviewedAt && (item.card.sm2?.repetitions || 0) === 0);
      }
    }

    // Filter by search query
    const q = (cardSearch || activeGroup.searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(item =>
        (item.card.front || '').toLowerCase().includes(q) ||
        (item.card.back || '').toLowerCase().includes(q) ||
        (item.card.rationale || '').toLowerCase().includes(q) ||
        (item.card.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort according to activeSort
    const sort = activeGroup.activeSort;
    if (sort === 'progress-asc') {
      result.sort((a, b) => (a.card.sm2?.repetitions || 0) - (b.card.sm2?.repetitions || 0));
    } else if (sort === 'progress-desc') {
      result.sort((a, b) => (b.card.sm2?.repetitions || 0) - (a.card.sm2?.repetitions || 0));
    } else if (sort === 'difficulty') {
      const diffOrder: Record<string, number> = { hard: 1, medium: 2, easy: 3 };
      result.sort((a, b) => (diffOrder[a.card.difficulty || 'medium'] || 2) - (diffOrder[b.card.difficulty || 'medium'] || 2));
    } else if (sort === 'alphabetical') {
      result.sort((a, b) => (a.card.front || '').localeCompare(b.card.front || ''));
    } else if (sort === 'most-reviewed') {
      result.sort((a, b) => (b.card.sm2?.repetitions || 0) - (a.card.sm2?.repetitions || 0));
    }

    return result;
  }, [allGroupCards, activeGroup, cardSearch, selectedGroupId, unassignedCards]);

  // Pagination calculations
  const totalCards = displayCards.length;
  const totalPages = Math.max(1, Math.ceil(totalCards / pageSize));

  // Reset to page 1 on group or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGroupId, cardSearch]);

  // Adjust page if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCards);

  const paginatedCards = useMemo(() => {
    return displayCards.slice(startIndex, endIndex);
  }, [displayCards, startIndex, endIndex]);

  // Generate pagination buttons with smart ellipsis (compact for mobile)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage, '...', totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleSaveGroupName = () => {
    if (!groupNameInput.trim() || !activeGroup) return;
    updatePracticeAreaName(selectedGroupId, groupNameInput.trim());
    setIsEditingGroupName(false);
    toast.success(`Practice area renamed to "${groupNameInput.trim()}"`);
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deleteGroupModal) return;
    const gId = deleteGroupModal.id;
    const gName = deleteGroupModal.name;
    setDeleteGroupModal(null);
    await deletePracticeArea(gId);
    const remaining = groupKeys.filter(k => k !== gId);
    setSelectedGroupId(remaining[0] || 'unassigned');
    toast.success(`Practice area "${gName}" deleted. Associated cards safely moved to Unassigned.`);
  };

  const handleConfirmDeleteFilter = () => {
    if (!deleteFilterModal || !activeGroup) return;
    removeGroupFilterItem(selectedGroupId, deleteFilterModal.id);
    const label = deleteFilterModal.label;
    setDeleteFilterModal(null);
    toast.success(`Removed filter "${label}"`);
  };

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterLabel.trim() || !newFilterTag.trim()) {
      toast.error('Please provide both a label and a tag keyword.');
      return;
    }
    addGroupFilterItem(selectedGroupId, {
      label: newFilterLabel.trim(),
      tag: newFilterTag.trim().toLowerCase()
    });
    setNewFilterLabel('');
    setNewFilterTag('');
    setIsAddingFilter(false);
    toast.success(`Added filter "${newFilterLabel.trim()}" to ${activeGroup?.name}`);
  };

  const handleStartEditFilter = (f: CardGroupFilterItem) => {
    setEditingFilterId(f.id);
    setEditLabel(f.label);
    setEditTag(f.tag);
  };

  const handleSaveEditFilter = (fId: string) => {
    if (!editLabel.trim() || !editTag.trim() || !activeGroup) return;
    const updatedFilters = activeGroup.filters.map(f =>
      f.id === fId ? { ...f, label: editLabel.trim(), tag: editTag.trim().toLowerCase() } : f
    );
    updateGroupFilterConfig(selectedGroupId, { filters: updatedFilters });
    setEditingFilterId(null);
    toast.success('Filter updated');
  };

  const handleMoveUp = (index: number) => {
    if (!activeGroup || index <= 0) return;
    const newFilters = [...activeGroup.filters];
    const temp = newFilters[index - 1];
    newFilters[index - 1] = newFilters[index];
    newFilters[index] = temp;
    reorderGroupFilterItems(selectedGroupId, newFilters.map(f => f.id));
  };

  const handleMoveDown = (index: number) => {
    if (!activeGroup || index >= activeGroup.filters.length - 1) return;
    const newFilters = [...activeGroup.filters];
    const temp = newFilters[index + 1];
    newFilters[index + 1] = newFilters[index];
    newFilters[index] = temp;
    reorderGroupFilterItems(selectedGroupId, newFilters.map(f => f.id));
  };

  const handleToggleAll = (enable: boolean) => {
    if (!activeGroup) return;
    const updated = activeGroup.filters.map(f => ({ ...f, enabled: enable }));
    updateGroupFilterConfig(selectedGroupId, { filters: updated });
    toast.info(enable ? 'Enabled all filters in this group' : 'Disabled all filters in this group');
  };

  const handleAddTagToCard = async (deckId: string, cardId: string, currentTags: string[]) => {
    if (!newTagInput.trim()) return;
    const tagToAdd = newTagInput.trim().toLowerCase();
    if (currentTags.includes(tagToAdd)) {
      toast.info('Card already has this tag');
      return;
    }
    const updatedTags = [...currentTags, tagToAdd];
    await updateCard(deckId, cardId, { tags: updatedTags });
    setNewTagInput('');
    setTaggingCardId(null);
    toast.success(`Tagged card with "${tagToAdd}"`);
  };

  const handleRemoveTagFromCard = async (deckId: string, cardId: string, tagToRemove: string, currentTags: string[]) => {
    const updatedTags = currentTags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    await updateCard(deckId, cardId, { tags: updatedTags });
    toast.success(`Removed tag "${tagToRemove}"`);
  };

  // Card assignment actions
  const handleAssignCard = async (deckId: string, cardId: string, targetGroupId: string) => {
    await assignCardToPracticeArea(deckId, cardId, targetGroupId);
    const targetName = cardGroupFilters[targetGroupId]?.name || targetGroupId;
    toast.success(`Assigned card to ${targetName}`);
  };

  const handleUnassignCard = async (deckId: string, cardId: string) => {
    await unassignCardFromPracticeArea(deckId, cardId);
    toast.info('Card unassigned and moved to Unassigned view');
  };

  // Inline rationale editing
  const startInlineEditRationale = (card: Flashcard) => {
    setInlineEditingCardId(card.id);
    setInlineRationaleText(card.rationale || '');
  };

  const cancelInlineRationale = () => {
    setInlineEditingCardId(null);
    setInlineRationaleText('');
  };

  const handleSaveInlineRationale = async (deckId: string, cardId: string) => {
    setIsSavingRationale(true);
    try {
      const trimmed = inlineRationaleText.trim();
      await updateCard(deckId, cardId, { rationale: trimmed });
      setInlineEditingCardId(null);
      setInlineRationaleText('');
      toast.success(trimmed ? 'Rationale updated successfully!' : 'Rationale cleared');
    } catch {
      toast.error('Failed to save rationale');
    } finally {
      setIsSavingRationale(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER BANNER                                                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-[var(--text-main)]">
              Filter & Practice Area Manager
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] max-w-2xl leading-relaxed">
            Manage practice areas and their filters. Rename practice areas (such as <strong>Clinical Nutrition & Biochemistry</strong>), delete filters or practice areas safely, and access unassigned cards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Reset all practice areas, filters, and settings to their defaults?')) {
              resetAllGroupFilters();
              setSelectedGroupId('nbcd');
              toast.success('All practice area filters reset to default');
            }
          }}
          className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-color)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Defaults</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* PRACTICE AREA / CARD GROUP SELECTOR TABS                           */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {groupKeys.map((key) => {
          const grp = cardGroupFilters[key];
          if (!grp) return null;
          const isSelected = selectedGroupId === key;

          // Count cards belonging to this group
          let grpCardCount = 0;
          for (const d of decks) {
            for (const c of d.cards || []) {
              if (isCardInGroup(c, d.category, grp)) {
                grpCardCount++;
              }
            }
          }

          const activeFiltersCount = grp.filters.filter(f => f.enabled).length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedGroupId(key);
                setIsEditingGroupName(false);
                setEditingFilterId(null);
                setIsAddingFilter(false);
              }}
              className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 relative overflow-hidden min-w-0 ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-light)]/40 shadow-xs ring-2 ring-[var(--primary)]/20'
                  : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0"
                  style={{
                    backgroundColor: `${grp.color}20`,
                    color: grp.color
                  }}
                >
                  {getGroupIcon(grp.icon)}
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0">
                  {grpCardCount} cards
                </span>
              </div>

              <div className="min-w-0">
                <span className="font-extrabold text-xs text-[var(--text-main)] block leading-tight truncate">
                  {grp.name}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-muted)] block mt-0.5 truncate">
                  {activeFiltersCount} of {grp.filters.length} filters active
                </span>
              </div>
            </button>
          );
        })}

        {/* Dedicated UNASSIGNED CARDS TAB */}
        <button
          type="button"
          onClick={() => {
            setSelectedGroupId('unassigned');
            setIsEditingGroupName(false);
            setEditingFilterId(null);
            setIsAddingFilter(false);
          }}
          className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 sm:gap-2.5 relative overflow-hidden min-w-0 ${
            selectedGroupId === 'unassigned'
              ? 'border-amber-500 bg-amber-500/15 shadow-xs ring-2 ring-amber-500/25'
              : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] hover:border-[var(--border-subtle)]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0">
              {unassignedCards.length} cards
            </span>
          </div>

          <div className="min-w-0">
            <span className="font-extrabold text-xs text-[var(--text-main)] block leading-tight truncate">
              Unassigned
            </span>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block mt-0.5 truncate">
              No practice area
            </span>
          </div>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* UNASSIGNED CARDS PANEL                                              */}
      {/* ------------------------------------------------------------------- */}
      {selectedGroupId === 'unassigned' ? (
        <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  Unassigned Cards ({unassignedCards.length})
                </span>
                <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
                  Cards Without Practice Area Assignment
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)] max-w-2xl">
                These flashcards do not belong to any active practice area. You can assign them to a practice area using the dropdown on each card, inspect and add missing rationales, or add tags.
              </p>
            </div>
          </div>

          {/* Cards list in unassigned mode */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Unassigned Reviewer Cards ({displayCards.length})</span>
              </h4>

              {/* In-view search box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3 h-3 text-[var(--text-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search unassigned cards..."
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                />
                {cardSearch && (
                  <button
                    type="button"
                    onClick={() => setCardSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalCards > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] w-full overflow-hidden">
                <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                  <span>
                    Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                    <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] border-l border-[var(--border-color)] pl-2.5">
                    <span className="text-[var(--text-subtle)] font-medium">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      aria-label="Cards per page"
                      className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Prev</span>
                    </button>
                    <div className="flex items-center gap-1 mx-0.5">
                      {pageNumbers.map((page, idx) =>
                        page === '...' ? (
                          <span key={`unassigned-top-ellipsis-${idx}`} className="px-1 text-[var(--text-subtle)] text-xs">
                            …
                          </span>
                        ) : (
                          <button
                            key={`unassigned-top-${page}`}
                            type="button"
                            onClick={() => setCurrentPage(Number(page))}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-[var(--primary)] text-white shadow-xs'
                                : 'border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Next page"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Unassigned Cards List */}
            <div className="space-y-2.5">
              {displayCards.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[var(--bg-surface-subtle)] border border-dashed border-[var(--border-color)] space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    No unassigned cards
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    {cardSearch
                      ? `No unassigned cards match "${cardSearch}".`
                      : 'All existing reviewer flashcards belong to active practice areas.'}
                  </p>
                </div>
              ) : (
                paginatedCards.map(({ card, deckTitle, deckId }) => {
                  const prog = getCardProgressInfo(card);
                  const hasRationale = Boolean(card.rationale && card.rationale.trim());
                  const isEditingThisRationale = inlineEditingCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--primary)]/40 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2.5 sm:gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${prog.color}`}>
                              {prog.badge}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              Deck: {deckTitle}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Unassigned
                            </span>
                            {hasRationale ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Rationale Available</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                <span>No rationale</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-[var(--text-main)] pt-0.5 leading-snug break-words [overflow-wrap:anywhere]">
                            <CompactCardText content={card.front} />
                          </div>

                          {/* Options if present */}
                          {card.options && card.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                              {card.options.map((opt, optIdx) => {
                                const isKey =
                                  cleanOptionLabel(opt).trim().toLowerCase() ===
                                  cleanRawHtml(card.back).trim().toLowerCase();
                                return (
                                  <div
                                    key={optIdx}
                                    className={`px-2 py-1 rounded-lg border text-[11px] flex items-start gap-1.5 ${
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

                          <div className="text-xs font-medium text-[var(--primary)] break-words [overflow-wrap:anywhere] flex items-baseline gap-1">
                            <span className="shrink-0 font-bold">Answer:</span>
                            <CompactCardText content={card.back} className="break-words" />
                          </div>
                        </div>

                        {/* Assign to Practice Area & Tag Controls */}
                        <div className="flex items-center gap-2 flex-wrap xs:shrink-0 self-start xs:self-auto">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignCard(deckId, card.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[var(--primary)] text-white text-[11px] font-bold cursor-pointer outline-none hover:bg-[var(--primary-hover)] shadow-xs transition-colors max-w-full xs:max-w-[190px] sm:max-w-none"
                          >
                            <option value="" disabled>
                              + Assign to Practice Area...
                            </option>
                            {groupKeys.map((k) => (
                              <option key={k} value={k}>
                                {cardGroupFilters[k].name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => setTaggingCardId(taggingCardId === card.id ? null : card.id)}
                            className="px-2 py-1 rounded-xl border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] shrink-0 transition-colors cursor-pointer"
                            title="Add/Edit Tags"
                          >
                            + Tag
                          </button>
                        </div>
                      </div>

                      {/* Tagging input popover */}
                      {taggingCardId === card.id && (
                        <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter tag (e.g. renal, pediatric)..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTagToCard(deckId, card.id, card.tags || [])}
                            className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-bold cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaggingCardId(null)}
                            className="p-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* RATIONALE SECTION */}
                      {isEditingThisRationale ? (
                        <div className="p-3 rounded-2xl bg-[var(--bg-surface-subtle)] border-2 border-[var(--primary)] space-y-2">
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
                            placeholder="Enter rationale..."
                            rows={3}
                            className="w-full p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] resize-y"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelInlineRationale}
                              disabled={isSavingRationale}
                              className="px-3 py-1 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface)] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineRationale(deckId, card.id)}
                              disabled={isSavingRationale}
                              className="px-3 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isSavingRationale ? 'Saving...' : 'Save Rationale'}</span>
                            </button>
                          </div>
                        </div>
                      ) : hasRationale ? (
                        <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Rationale:
                            </span>
                            <button
                              type="button"
                              onClick={() => startInlineEditRationale(card)}
                              className="text-[10px] font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-normal">
                            {cleanRawHtml(card.rationale)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/30">
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 min-w-0">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-[11px] font-semibold break-words">No rationale provided for this card</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startInlineEditRationale(card)}
                            className="self-start xs:self-auto px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs shrink-0 min-h-[30px]"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Rationale</span>
                          </button>
                        </div>
                      )}

                      {/* Card Tags */}
                      {(card.tags || []).length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border-subtle)]">
                          {(card.tags || []).map((t, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                            >
                              <span>#{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTagFromCard(deckId, card.id, t, card.tags || [])}
                                className="hover:text-rose-500 font-bold ml-0.5 cursor-pointer"
                                title="Remove tag"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Pagination Controls Bar */}
            {totalCards > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] mt-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span>
                    Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                    <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] border-l border-[var(--border-color)] pl-2.5">
                    <span className="text-[var(--text-subtle)]">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1 mx-0.5">
                      {pageNumbers.map((page, idx) =>
                        page === '...' ? (
                          <span key={`unassigned-bottom-ellipsis-${idx}`} className="px-1 text-[var(--text-subtle)] text-xs">
                            …
                          </span>
                        ) : (
                          <button
                            key={`unassigned-bottom-${page}`}
                            type="button"
                            onClick={() => setCurrentPage(Number(page))}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-[var(--primary)] text-white shadow-xs'
                                : 'border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Next page"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeGroup ? (
        /* ------------------------------------------------------------------- */
        /* ACTIVE PRACTICE AREA CONTROLS PANEL                                */
        /* ------------------------------------------------------------------- */
        <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs space-y-5 sm:space-y-6">
          {/* Group Header Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${activeGroup.color}20`,
                    color: activeGroup.color
                  }}
                >
                  {activeGroup.id.toUpperCase()} Practice Area
                </span>

                {/* Edit Practice Area Name inline */}
                {isEditingGroupName ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      placeholder="Practice Area Name"
                      className="px-3 py-1 rounded-xl bg-[var(--bg-surface)] border-2 border-[var(--primary)] text-sm font-bold text-[var(--text-main)] outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveGroupName();
                        if (e.key === 'Escape') setIsEditingGroupName(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveGroupName}
                      className="p-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] cursor-pointer"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGroupName(false)}
                      className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-[var(--text-main)]">
                      {activeGroup.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupNameInput(activeGroup.name);
                        setIsEditingGroupName(true);
                      }}
                      className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
                      title="Edit Practice Area Name"
                      aria-label="Edit Practice Area Name"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {activeGroup.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setDeleteGroupModal(activeGroup)}
                className="px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Delete entire practice area"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Area</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetGroupFilterConfig(selectedGroupId);
                  toast.success(`Reset filters for ${activeGroup.name}`);
                }}
                className="px-3 py-1 rounded-xl border border-[var(--border-color)] text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Defaults</span>
              </button>
            </div>
          </div>

          {/* Independent Sort & Progress Stage Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)]">
            {/* 1. Sorting Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Independent Sorting Preference:</span>
              </label>
              <select
                value={activeGroup.activeSort}
                onChange={(e) => updateGroupFilterConfig(selectedGroupId, { activeSort: e.target.value as CardSortOption })}
                aria-label="Independent Sorting Preference"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer"
              >
                <option value="default">Default Exam Order (Shuffled)</option>
                <option value="progress-asc">Unseen & In Learning First</option>
                <option value="progress-desc">Mastered First (Highest Reps)</option>
                <option value="difficulty">By Difficulty (Hard First)</option>
                <option value="most-reviewed">Most Reviewed First</option>
                <option value="alphabetical">Alphabetical (A to Z)</option>
              </select>
              <span className="text-[10px] text-[var(--text-muted)] block">
                Applied exclusively when practicing or reviewing {activeGroup.name}.
              </span>
            </div>

            {/* 2. Progress Stage Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>Independent Card Progression Stage:</span>
              </label>
              <select
                value={activeGroup.stageFilter}
                onChange={(e) => updateGroupFilterConfig(selectedGroupId, { stageFilter: e.target.value as CardFilterOption })}
                aria-label="Independent Card Progression Stage"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-main)] focus:border-[var(--primary)] outline-none cursor-pointer"
              >
                <option value="all">All Progression Stages (Full Deck)</option>
                <option value="unseen">🆕 Unseen / New Cards Only</option>
                <option value="learning">🔄 In Learning Stage Only</option>
                <option value="developing">📈 Developing Recall Only</option>
                <option value="mastered">🏆 Mastered Cards Only</option>
                <option value="due">⏰ Due for Review Today Only</option>
                <option value="wrong">❌ Wrong / Difficult Cards Only</option>
              </select>
              <span className="text-[10px] text-[var(--text-muted)] block">
                Only focuses on cards at this learning stage for this card group.
              </span>
            </div>
          </div>

          {/* Filter Management (Add, Remove, Reorder, Delete) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Filters Assigned to {activeGroup.name}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] ml-1">
                    {activeGroup.filters.length}
                  </span>
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Toggle filters on/off to isolate cards. Reorder priority, edit criteria, or delete filters when not needed.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleToggleAll(true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors cursor-pointer"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAll(false)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
                >
                  Disable All
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingFilter(!isAddingFilter)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Filter</span>
                </button>
              </div>
            </div>

            {/* ADD NEW FILTER FORM */}
            <AnimatePresence>
              {isAddingFilter && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddFilter}
                  className="p-4 rounded-2xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Create New Filter for {activeGroup.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingFilter(false)}
                      className="text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Filter Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Critical Care Nutrition"
                        value={newFilterLabel}
                        onChange={(e) => setNewFilterLabel(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Matching Tag or Keyword
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. critical care, icu, enteral"
                        value={newFilterTag}
                        onChange={(e) => setNewFilterTag(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingFilter(false)}
                      className="px-3 py-1 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold shadow-xs hover:bg-[var(--primary-hover)] cursor-pointer"
                    >
                      Save Filter
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* FILTER ITEMS LIST */}
            <div className="space-y-2">
              {activeGroup.filters.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  No filters currently defined for {activeGroup.name}. Click &quot;Add Filter&quot; above to create one.
                </div>
              ) : (
                activeGroup.filters.map((f, idx) => {
                  const isEditing = editingFilterId === f.id;
                  const matchCount = filterCounts.get(f.id) || 0;

                  return (
                    <div
                      key={f.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        f.enabled
                          ? 'bg-[var(--bg-surface)] border-[var(--border-color)] shadow-2xs'
                          : 'bg-[var(--bg-surface-subtle)]/50 border-[var(--border-subtle)] opacity-60'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--primary)] text-xs font-bold text-[var(--text-main)]"
                            placeholder="Filter Label"
                          />
                          <input
                            type="text"
                            value={editTag}
                            onChange={(e) => setEditTag(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--primary)] text-xs font-bold text-[var(--text-main)]"
                            placeholder="Tag Keyword"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEditFilter(f.id)}
                              className="p-1.5 rounded-lg bg-[var(--primary)] text-white text-xs hover:bg-[var(--primary-hover)] cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFilterId(null)}
                              className="p-1.5 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Checkbox toggle */}
                          <button
                            type="button"
                            onClick={() => toggleGroupFilterItem(selectedGroupId, f.id)}
                            aria-label={`Toggle filter ${f.label}`}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                              f.enabled
                                ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-[var(--text-main)]">
                                {f.label}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                                tag: #{f.tag}
                              </span>
                            </div>
                          </div>

                          {/* Matching count badge */}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-muted)] shrink-0">
                            {matchCount} {matchCount === 1 ? 'card' : 'cards'}
                          </span>
                        </div>
                      )}

                      {/* Action buttons (Reorder, Edit, Delete) */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          aria-label="Move filter up"
                          className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === activeGroup.filters.length - 1}
                          aria-label="Move filter down"
                          className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditFilter(f)}
                          aria-label="Edit filter"
                          className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
                          title="Edit Filter Name/Tag"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteFilterModal(f)}
                          aria-label="Delete filter"
                          className="p-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete Filter"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* ASSIGNED CARDS EXPLORER (SEGREGATED CARDS PREVIEW)               */}
          {/* ----------------------------------------------------------------- */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-main)] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Cards Matching Current Filters ({displayCards.length} of {allGroupCards.length})</span>
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Viewing flashcards strictly segregated under {activeGroup.name} with your active filters and sort applied.
                </p>
              </div>

              {/* In-view search box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3 h-3 text-[var(--text-subtle)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search matching cards..."
                  value={cardSearch}
                  onChange={(e) => setCardSearch(e.target.value)}
                  className="w-full pl-7 pr-7 py-1.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-main)] focus:border-[var(--primary)] outline-none"
                />
                {cardSearch && (
                  <button
                    type="button"
                    onClick={() => setCardSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-subtle)] hover:text-[var(--text-main)]"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Pagination Controls Bar */}
            {totalCards > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span>
                    Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                    <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] border-l border-[var(--border-color)] pl-2.5">
                    <span className="text-[var(--text-subtle)]">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1 mx-0.5">
                      {pageNumbers.map((page, idx) =>
                        page === '...' ? (
                          <span key={`assigned-top-ellipsis-${idx}`} className="px-1 text-[var(--text-subtle)] text-xs">
                            …
                          </span>
                        ) : (
                          <button
                            key={`assigned-top-${page}`}
                            type="button"
                            onClick={() => setCurrentPage(Number(page))}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-[var(--primary)] text-white shadow-xs'
                                : 'border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Next page"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Cards List Grid */}
            <div className="space-y-2.5">
              {displayCards.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[var(--bg-surface-subtle)] border border-dashed border-[var(--border-color)] space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    No flashcards match the current active filters for {activeGroup.name}.
                  </p>
                  <p className="text-[11px] text-[var(--text-subtle)]">
                    Try enabling additional filters or clearing the search keyword.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="px-3 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold cursor-pointer"
                  >
                    Enable All Filters
                  </button>
                </div>
              ) : (
                paginatedCards.map(({ card, deckTitle, deckId }) => {
                  const prog = getCardProgressInfo(card);
                  const matchingActiveFilters = activeGroup.filters.filter(f => f.enabled && cardMatchesFilter(card, f));
                  const hasRationale = Boolean(card.rationale && card.rationale.trim());
                  const isEditingThisRationale = inlineEditingCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[var(--primary)]/40 transition-all space-y-2.5"
                    >
                      <div className="flex flex-col xs:flex-row xs:items-start justify-between gap-2.5 sm:gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${prog.color}`}>
                              {prog.badge}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              Deck: {deckTitle}
                            </span>
                            {card.difficulty && (
                              <span className="text-[10px] font-bold text-[var(--text-subtle)] uppercase">
                                • {card.difficulty}
                              </span>
                            )}
                            {hasRationale ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Rationale Available</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                <span>No rationale</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-[var(--text-main)] pt-0.5 leading-snug break-words [overflow-wrap:anywhere]">
                            <CompactCardText content={card.front} />
                          </div>

                          {/* Options if present */}
                          {card.options && card.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                              {card.options.map((opt, optIdx) => {
                                const isKey =
                                  cleanOptionLabel(opt).trim().toLowerCase() ===
                                  cleanRawHtml(card.back).trim().toLowerCase();
                                return (
                                  <div
                                    key={optIdx}
                                    className={`px-2 py-1 rounded-lg border text-[11px] flex items-start gap-1.5 ${
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

                          <div className="text-xs font-medium text-[var(--primary)] break-words [overflow-wrap:anywhere] flex items-baseline gap-1">
                            <span className="shrink-0 font-bold">Answer:</span>
                            <CompactCardText content={card.back} className="break-words" />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap xs:shrink-0 self-start xs:self-auto">
                          <button
                            type="button"
                            onClick={() => handleUnassignCard(deckId, card.id)}
                            className="px-2.5 py-1 rounded-xl border border-[var(--border-color)] text-[10px] font-semibold text-[var(--text-muted)] hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Remove card assignment and move to Unassigned"
                          >
                            Unassign
                          </button>

                          <button
                            type="button"
                            onClick={() => setTaggingCardId(taggingCardId === card.id ? null : card.id)}
                            className="px-2 py-1 rounded-xl border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-subtle)] shrink-0 transition-colors cursor-pointer"
                            title="Add/Edit Tags"
                          >
                            + Tag
                          </button>
                        </div>
                      </div>

                      {/* Tagging input popover */}
                      {taggingCardId === card.id && (
                        <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter tag (e.g. maternal, renal)..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTagToCard(deckId, card.id, card.tags || [])}
                            className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-bold cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaggingCardId(null)}
                            className="p-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* RATIONALE SECTION */}
                      {isEditingThisRationale ? (
                        <div className="p-3 rounded-2xl bg-[var(--bg-surface-subtle)] border-2 border-[var(--primary)] space-y-2">
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
                            placeholder="Enter rationale..."
                            rows={3}
                            className="w-full p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary)] resize-y"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelInlineRationale}
                              disabled={isSavingRationale}
                              className="px-3 py-1 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface)] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveInlineRationale(deckId, card.id)}
                              disabled={isSavingRationale}
                              className="px-3 py-1 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isSavingRationale ? 'Saving...' : 'Save Rationale'}</span>
                            </button>
                          </div>
                        </div>
                      ) : hasRationale ? (
                        <div className="p-2.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Rationale:
                            </span>
                            <button
                              type="button"
                              onClick={() => startInlineEditRationale(card)}
                              className="text-[10px] font-bold text-[var(--primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap font-normal">
                            {cleanRawHtml(card.rationale)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-dashed border-amber-500/30">
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 min-w-0">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-[11px] font-semibold break-words">No rationale provided for this card</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => startInlineEditRationale(card)}
                            className="self-start xs:self-auto px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs shrink-0 min-h-[30px]"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Rationale</span>
                          </button>
                        </div>
                      )}

                      {/* Matched Filter Tags & Card Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-[10px] font-bold text-[var(--text-subtle)]">
                          Matches:
                        </span>
                        {matchingActiveFilters.map((mf) => (
                          <span
                            key={mf.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{mf.label}</span>
                          </span>
                        ))}

                        {/* Card Tags */}
                        {(card.tags || []).map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                          >
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTagFromCard(deckId, card.id, t, card.tags || [])}
                              className="hover:text-rose-500 font-bold ml-0.5 cursor-pointer"
                              title="Remove tag"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Pagination Controls Bar */}
            {totalCards > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] mt-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span>
                    Showing <span className="font-bold text-[var(--text-main)]">{startIndex + 1}–{endIndex}</span> of{' '}
                    <span className="font-bold text-[var(--text-main)]">{totalCards}</span> cards
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] border-l border-[var(--border-color)] pl-2.5">
                    <span className="text-[var(--text-subtle)]">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-semibold outline-none cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Prev</span>
                    </button>

                    <div className="flex items-center gap-1 mx-0.5">
                      {pageNumbers.map((page, idx) =>
                        page === '...' ? (
                          <span key={`assigned-bottom-ellipsis-${idx}`} className="px-1 text-[var(--text-subtle)] text-xs">
                            …
                          </span>
                        ) : (
                          <button
                            key={`assigned-bottom-${page}`}
                            type="button"
                            onClick={() => setCurrentPage(Number(page))}
                            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? 'bg-[var(--primary)] text-white shadow-xs'
                                : 'border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] text-[var(--text-main)]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-subtle)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      title="Next page"
                    >
                      <span className="hidden xs:inline">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------- */}
      {/* DELETE FILTER CONFIRMATION MODAL                                    */}
      {/* ------------------------------------------------------------------- */}
      {deleteFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-2xl border border-[var(--border-color)] max-w-sm w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-[var(--text-main)]">
                Delete Filter: {deleteFilterModal.label}?
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                This will delete the filter tag keyword <span className="font-mono text-[var(--primary)] font-bold">#{deleteFilterModal.tag}</span> from <strong>{activeGroup?.name}</strong>. Flashcard records, rationales, and the practice area will <strong>NOT</strong> be deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteFilterModal(null)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFilter}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* DELETE PRACTICE AREA CONFIRMATION MODAL                             */}
      {/* ------------------------------------------------------------------- */}
      {deleteGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--bg-surface)] text-[var(--text-main)] rounded-3xl border border-[var(--border-color)] max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-extrabold text-base text-[var(--text-main)] leading-snug">
                  Delete Practice Area: {deleteGroupModal.name}?
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  This action removes the practice area and its custom filters from your reviewer.
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 mt-2">
                  <strong>Safe Migration:</strong> Associated flashcards, rationales, and SM-2 study progress will <strong>NOT</strong> be deleted. They will automatically be moved to the <strong>Unassigned</strong> category so you can reassign or review them at any time.
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setDeleteGroupModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteGroup}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Practice Area</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
