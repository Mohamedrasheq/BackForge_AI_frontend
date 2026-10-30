import { EditableItemRow } from '@/components/items/editable-item-row';
import { DeleteItemDialog } from '@/components/items/delete-item-dialog';
import { MonthCalendar } from '@/components/items/month-calendar';
import { ReviewEntry } from '@/components/review/review-entry';
import { type ItemDraft } from '@/components/items/item-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { FilterChips } from '@/components/ui/filter-chips';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cardSurface, Theme } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useAllItems } from '@/hooks/use-items';
import { useNotificationEnable } from '@/hooks/use-notification-enable';
import { useReviewEntry } from '@/hooks/use-review-entry';
import { REVIEW_HREF } from '@/lib/review-push';
import {
  buildCategoryBrowseRows,
  categoryBrowseAccessibilityLabel,
  categoryBrowseTotalCount,
  type CategoryBrowseRow,
} from '@/lib/category-browse';
import { groupItemsByCategory } from '@/lib/categories';
import {
  CLEAR_DATE_LABEL,
  DATE_FILTER_EMPTY_DESCRIPTION,
  calendarDayFromDate,
  dateChipLabel,
  dateFilterEmptyTitle,
  dayKey,
  filterItemsByStatusAndDay,
  longDateLabel,
  type CalendarDay,
} from '@/lib/date-filter';
import { haptics } from '@/lib/haptics';
import { UPCOMING_EMPTY, upcomingSections } from '@/lib/upcoming';
import type { Item, ItemStatus } from '@/types/api';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ItemsView = 'calendar' | 'category';

const VIEW_OPTIONS: { value: ItemsView; label: string }[] = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'category', label: 'Category' },
];

type CalendarList = ItemStatus | 'upcoming';

const STATUS_OPTIONS: { value: CalendarList; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'upcoming', label: 'Upcoming' },
];

const DONE_EMPTY: { icon: IconSymbolName; title: string; description: string } = {
  icon: 'checkmark',
  title: 'Nothing done',
  description: 'Nothing marked done yet.',
};

function CategoryRow({
  row,
  first,
  onPress,
}: {
  row: CategoryBrowseRow;
  first: boolean;
  onPress: (row: CategoryBrowseRow) => void;
}) {
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={categoryBrowseAccessibilityLabel(row.name, row.openCount, row.doneCount)}
      onPress={() => onPress(row)}
      style={({ pressed }) => [styles.categoryRow, pressed && styles.categoryRowPressed]}
    >
      <View style={styles.categoryIcon}>
        <IconSymbol
          name={row.unfiled ? 'tray' : 'tag'}
          size={18}
          color={row.unfiled ? Theme.color.textTertiary : Theme.color.accent}
        />
      </View>
      <View style={[styles.categoryBody, !first && styles.categoryDivider]}>
        <Text style={[styles.categoryName, row.unfiled && styles.categoryNameMuted]} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={[styles.count, row.openCount > 0 && styles.countOpen]}>
          {categoryBrowseTotalCount(row.openCount, row.doneCount)}
        </Text>
        <IconSymbol name="chevron.right" size={18} color={Theme.color.textTertiary} />
      </View>
    </Pressable>
  );
}

export default function AllItemsScreen() {
  const router = useRouter();
  const review = useReviewEntry('items');
  const { permission, refreshPermission } = useNotificationEnable();
  const [view, setView] = useState<ItemsView>('calendar');
  const [status, setStatus] = useState<CalendarList>('open');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = calendarDayFromDate(new Date());
    return { year: today.year, month: today.month };
  });
  const {
    items,
    loading,
    refreshing,
    error,
    reload,
    markDone,
    saveItem,
    removeItem,
    reschedule,
    movingId,
  } = useAllItems();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories();
  const [datePickerId, setDatePickerId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission])
  );

  const calendarItems = useMemo(() => {
    if (view !== 'calendar' || status === 'upcoming') return [];
    return filterItemsByStatusAndDay(items, status, selectedDay);
  }, [items, selectedDay, status, view]);
  const sections = useMemo(() => {
    if (view !== 'calendar') return [];
    if (status === 'upcoming') return upcomingSections(items, selectedDay);
    return groupItemsByCategory(calendarItems, categories);
  }, [calendarItems, categories, items, selectedDay, status, view]);
  const listedCount =
    status === 'upcoming'
      ? sections.reduce((sum, section) => sum + section.data.length, 0)
      : calendarItems.length;
  const categoryRows = useMemo(
    () => (view === 'category' ? buildCategoryBrowseRows(categories, items) : []),
    [categories, items, view]
  );
  const categoriesSettled = !categoriesLoading || Boolean(categoriesError);
  const categoryBlocking =
    view === 'category' &&
    ((loading && items.length === 0) || (!categoriesSettled && !categoriesError));
  const hideCategoryRows = Boolean(error) && items.length === 0;
  const shownCategoryRows = hideCategoryRows ? [] : categoryRows;

  const openEmpty = !selectedDay && status === 'open';
  const dateFilterActive = selectedDay !== null;
  const showNotifications =
    status === 'upcoming' && permission !== null && permission !== 'granted';
  const listBlocked = (loading && items.length === 0) || (!categoriesSettled && listedCount > 0);

  const clearDate = () => setSelectedDay(null);

  const resetRowActions = () => {
    setEditingId(null);
    setPendingDeleteId(null);
    setDatePickerId(null);
  };

  const changeSelectedDay = (day: CalendarDay | null) => {
    Keyboard.dismiss();
    setSelectedDay(day);
  };

  const pendingDelete = useMemo(
    () => items.find((item) => item.id === pendingDeleteId) ?? null,
    [items, pendingDeleteId]
  );

  const onSave = async (id: string, draft: ItemDraft) => {
    setSaving(true);
    try {
      await saveItem(id, draft);
      setEditingId(null);
      haptics.success();
      void review.reload();
    } catch {
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeleting(true);
    try {
      await removeItem(id);
      setPendingDeleteId(null);
      setEditingId((current) => (current === id ? null : current));
      haptics.success();
      void review.reload();
    } catch {
      haptics.error();
    } finally {
      setDeleting(false);
    }
  };

  const openCategory = (row: CategoryBrowseRow) => {
    haptics.light();
    router.push({
      pathname: '/category/[id]',
      params: { id: row.id, name: row.name },
    });
  };

  const renderItem = ({ item }: { item: Item }) => (
    <EditableItemRow
      item={item}
      categories={categories}
      editing={editingId === item.id}
      saving={saving}
      movingId={movingId}
      datePickerId={datePickerId}
      onDone={(next) => {
        void markDone(next.id).finally(() => {
          void review.reload();
        });
      }}
      onReschedule={(next, dueAt) => {
        setDatePickerId(null);
        void reschedule(next.id, dueAt).finally(() => {
          void review.reload();
        });
      }}
      onOpenDatePicker={setDatePickerId}
      onCloseDatePicker={(id) => setDatePickerId((current) => (current === id ? null : current))}
      onEdit={(next) => {
        haptics.light();
        setDatePickerId(null);
        setEditingId(next.id);
        setPendingDeleteId(null);
      }}
      onSave={(id, draft) => void onSave(id, draft)}
      onCancelEdit={() => setEditingId(null)}
      onEditorDelete={() => {
        haptics.warning();
        setPendingDeleteId(item.id);
      }}
      onRowDelete={(next) => {
        haptics.warning();
        setDatePickerId(null);
        setEditingId(null);
        setPendingDeleteId(next.id);
      }}
    />
  );

  const refresh = () => {
    void reload(true);
    void reloadCategories();
    void review.reload();
    void refreshPermission();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="All items" />

        {review.show ? (
          <ReviewEntry
            count={review.count}
            onReview={() => router.push(REVIEW_HREF)}
            onDismiss={review.dismiss}
          />
        ) : null}

        <SegmentedControl
          value={view}
          options={VIEW_OPTIONS}
          onChange={(next) => {
            setView(next);
            resetRowActions();
          }}
        />

        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
        {view === 'category' && categoriesError && !error ? (
          <ErrorBanner message={categoriesError} onRetry={() => void reloadCategories()} />
        ) : null}

        {view === 'category' ? (
          categoryBlocking ? (
            error ? (
              <View style={styles.flex} />
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator color={Theme.color.accent} />
              </View>
            )
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.list,
                shownCategoryRows.length === 0 && styles.emptyList,
              ]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={Theme.color.accent}
                />
              }
            >
              {shownCategoryRows.length > 0 ? (
                <View style={styles.categoryGroup}>
                  {shownCategoryRows.map((row, index) => (
                    <CategoryRow key={row.id} row={row} first={index === 0} onPress={openCategory} />
                  ))}
                </View>
              ) : hideCategoryRows || (categoriesError && categories.length === 0) ? null : (
                <EmptyState
                  mark="list"
                  title="No categories yet"
                  description="Categories are added when you confirm a capture"
                  actionLabel="Go to Capture"
                  onAction={() => router.navigate('/(tabs)/capture')}
                />
              )}
            </ScrollView>
          )
        ) : (
          <SectionList
            key={`${status}:${selectedDay ? dayKey(selectedDay) : 'all'}`}
            sections={listBlocked ? [] : sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            stickySectionHeadersEnabled={false}
            extraData={`${editingId ?? ''}:${pendingDeleteId ?? ''}:${saving}:${datePickerId ?? ''}:${movingId ?? ''}:${categories.map((category) => category.id).join(',')}`}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={Theme.color.accent}
              />
            }
            ListHeaderComponent={
              <View>
                <View style={styles.calendarBlock}>
                  <MonthCalendar
                    items={items}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    selected={selectedDay}
                    onSelectedChange={changeSelectedDay}
                  />
                </View>
                <FilterChips
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(next) => {
                    setStatus(next);
                    resetRowActions();
                  }}
                />
                {showNotifications ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Turn on notifications in Account"
                    onPress={() => {
                      haptics.light();
                      router.navigate('/(tabs)/account');
                    }}
                    style={({ pressed }) => [styles.notifyCard, pressed && styles.pressed]}
                  >
                    <Text style={styles.notifyText}>Turn on notifications in Account</Text>
                  </Pressable>
                ) : null}
                {selectedDay ? (
                  <Text
                    style={styles.dateHeading}
                    accessibilityRole="header"
                    accessibilityLabel={longDateLabel(selectedDay)}
                  >
                    {dateChipLabel(selectedDay)}
                  </Text>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              listBlocked ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={Theme.color.accent} />
                </View>
              ) : status === 'upcoming' ? (
                <EmptyState
                  description={UPCOMING_EMPTY}
                  actionLabel={dateFilterActive ? CLEAR_DATE_LABEL : undefined}
                  onAction={dateFilterActive ? clearDate : undefined}
                />
              ) : dateFilterActive && selectedDay ? (
                <EmptyState
                  title={dateFilterEmptyTitle(status, selectedDay)}
                  description={DATE_FILTER_EMPTY_DESCRIPTION}
                  actionLabel={CLEAR_DATE_LABEL}
                  onAction={clearDate}
                />
              ) : openEmpty ? (
                <EmptyState
                  mark="list"
                  title="Nothing open"
                  description="Capture a plan to fill this list"
                  actionLabel="Go to Capture"
                  onAction={() => router.navigate('/(tabs)/capture')}
                />
              ) : (
                <EmptyState
                  icon={DONE_EMPTY.icon}
                  title={DONE_EMPTY.title}
                  description={DONE_EMPTY.description}
                />
              )
            }
            renderSectionHeader={({ section }) => (
              <Text
                style={[
                  styles.sectionHeader,
                  section === sections[0] && styles.sectionHeaderFirst,
                ]}
              >
                {section.title}
              </Text>
            )}
            renderItem={renderItem}
          />
        )}
        {pendingDelete ? (
          <DeleteItemDialog
            item={pendingDelete}
            deleting={deleting}
            onCancel={() => {
              if (deleting) return;
              setPendingDeleteId(null);
            }}
            onConfirm={() => void onDelete(pendingDelete.id)}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  calendarBlock: {
    marginBottom: Theme.space.md,
  },
  dateHeading: {
    marginBottom: Theme.space.sm,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  notifyCard: {
    ...cardSurface,
    marginBottom: Theme.space.md,
    paddingVertical: 14,
    paddingHorizontal: Theme.space.md,
  },
  notifyText: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    fontWeight: '500',
    color: Theme.color.accent,
  },
  list: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottom,
    flexGrow: 1,
  },
  emptyList: {
    justifyContent: 'center',
  },
  loadingBlock: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: {
    height: Theme.space.listGap,
  },
  sectionHeader: {
    marginTop: Theme.space.lg,
    marginBottom: Theme.space.sm,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGroup: {
    ...cardSurface,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: Theme.space.md,
  },
  categoryRowPressed: {
    backgroundColor: Theme.color.background,
  },
  categoryIcon: {
    width: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    paddingVertical: 14,
    paddingRight: 12,
  },
  categoryDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.color.border,
  },
  pressed: {
    opacity: 0.7,
  },
  categoryName: {
    flex: 1,
    fontSize: Theme.type.body,
    lineHeight: 22,
    fontWeight: '400',
    color: Theme.color.text,
  },
  categoryNameMuted: {
    color: Theme.color.textSecondary,
  },
  count: {
    flexShrink: 0,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  countOpen: {
    color: Theme.color.accent,
  },
});
