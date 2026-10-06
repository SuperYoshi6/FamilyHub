# Implementation Plan - Autumn Mode, Collapsed List Categories, Widget Live Data, and Notification Deep Linking

This plan outlines the implementation for:
1. Replacing Summer Mode with Autumn Mode ("Herbst Modus") with warm orange tones and leaf motifs.
2. Collapsing additional inputs/categories by default in shopping lists and household tasks.
3. Re-enabling and ensuring real-time live data synchronization for Android home screen widgets.
4. Implementing robust notification click handling to open the app directly to the relevant view (e.g., Shopping List) when tapped from a closed state.

## User Review Required

> [!IMPORTANT]
> Please review the proposed changes below before execution.

## Proposed Changes

### [Navigation & Styling]
#### [MODIFY] [Navigation.tsx](file:///C:/Users/Jan/Downloads/FamilyHub/components/Navigation.tsx)
- Replace `summerMode` with `autumnMode`.
- Use autumn-themed icons (`Leaf`, `Wind`, `Coffee`, etc.) and warm orange/amber gradient themes.

#### [MODIFY] [SettingsPage.tsx](file:///C:/Users/Jan/Downloads/FamilyHub/pages/SettingsPage.tsx)
- Replace Summer Mode toggle with Autumn Mode toggle ("Herbst Modus").

### [Shopping Lists & Household Tasks]
#### [MODIFY] [ListsPage.tsx](file:///C:/Users/Jan/Downloads/FamilyHub/pages/ListsPage.tsx)
- Collapse category selection / additional inputs by default (toggleable via an expand/collapse button).

### [Widgets & Live Data Sync]
#### [MODIFY] [WidgetBridge.ts](file:///C:/Users/Jan/Downloads/FamilyHub/services/widgetBridge.ts) & [WidgetProvider.java](file:///C:/Users/Jan/Downloads/FamilyHub/android/app/src/main/java/com/familienhub/app/WidgetProvider.java)
- Ensure widget data is pushed and updated in real-time when shopping lists, tasks, or calendar items change.

### [Notification Deep Linking]
#### [MODIFY] [fcm.ts](file:///C:/Users/Jan/Downloads/FamilyHub/services/fcm.ts) & [App.tsx](file:///C:/Users/Jan/Downloads/FamilyHub/App.tsx) & [MainActivity.java](file:///C:/Users/Jan/Downloads/FamilyHub/android/app/src/main/java/com/familienhub/app/MainActivity.java)
- Listen to local notification and push notification click listeners to route directly to `AppRoute.LISTS` when opened from a notification.

## Verification Plan

### Automated Tests
- Build test via `gradle_build` and `npm run cap:sync`.

### Manual Verification
- Verify Autumn Mode styling, collapsed list categories, live widget data updates, and notification click navigation.
