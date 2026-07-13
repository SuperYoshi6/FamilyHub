package com.familienhub.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

public abstract class WidgetProvider extends AppWidgetProvider {

    protected abstract int getWidgetLayout();
    protected abstract String getDataKey();
    protected abstract String getCountKey();
    protected abstract String getDeepLink();
    protected abstract int getListId();
    protected abstract int getCountId();

    private static final String PREFS_NAME = "familyhub_widget_data";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), getWidgetLayout());
            bindData(context, views);
            setClickHandlers(context, views, widgetId);
            appWidgetManager.updateAppWidget(widgetId, views);
        }
    }

    private void bindData(Context context, RemoteViews views) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String items = prefs.getString(getDataKey(), context.getString(R.string.widget_empty));
        String count = prefs.getString(getCountKey(), "");
        views.setTextViewText(getListId(), items);
        views.setTextViewText(getCountId(), count);
    }

    private void setClickHandlers(Context context, RemoteViews views, int widgetId) {
        // Tap on background → open app
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        appIntent.setData(Uri.parse(getDeepLink()));
        PendingIntent appPendingIntent = PendingIntent.getActivity(
                context, widgetId, appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(android.R.id.background, appPendingIntent);

        // Tap on "Aktualisieren" → trigger APPWIDGET_UPDATE for this provider
        Intent refreshIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        refreshIntent.setComponent(new ComponentName(context, this.getClass()));
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, widgetId + 1000, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent);
    }

    public static void saveWidgetData(Context context, String key, String value) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(key, value).apply();
    }

    public static void notifyWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        updateSingleWidget(context, manager, prefs, ShoppingWidgetProvider.class, new ShoppingWidgetProvider());
        updateSingleWidget(context, manager, prefs, CalendarWidgetProvider.class, new CalendarWidgetProvider());
        updateSingleWidget(context, manager, prefs, TasksWidgetProvider.class, new TasksWidgetProvider());
        updateSingleWidget(context, manager, prefs, MealPlanWidgetProvider.class, new MealPlanWidgetProvider());
        updateSingleWidget(context, manager, prefs, MealRequestsWidgetProvider.class, new MealRequestsWidgetProvider());
    }

    private static void updateSingleWidget(Context context, AppWidgetManager manager,
                                            SharedPreferences prefs,
                                            Class<? extends WidgetProvider> providerClass,
                                            WidgetProvider provider) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, providerClass));
        for (int widgetId : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), provider.getWidgetLayout());
            String items = prefs.getString(provider.getDataKey(), context.getString(R.string.widget_empty));
            String count = prefs.getString(provider.getCountKey(), "");
            views.setTextViewText(provider.getListId(), items);
            views.setTextViewText(provider.getCountId(), count);
            // Set open-app intent
            Intent appIntent = new Intent(context, MainActivity.class);
            appIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            appIntent.setData(android.net.Uri.parse(provider.getDeepLink()));
            android.app.PendingIntent appPendingIntent = android.app.PendingIntent.getActivity(
                    context, widgetId, appIntent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(android.R.id.background, appPendingIntent);
            // Set refresh button intent
            Intent refreshIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            refreshIntent.setComponent(new ComponentName(context, providerClass));
            android.app.PendingIntent refreshPendingIntent = android.app.PendingIntent.getBroadcast(
                    context, widgetId + 1000, refreshIntent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent);
            // Update directly via manager (more reliable than sendBroadcast on newer Android)
            manager.updateAppWidget(widgetId, views);
        }
    }
}
