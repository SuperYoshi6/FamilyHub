package com.familienhub.app;

public class CalendarWidgetProvider extends WidgetProvider {
    @Override
    protected int getWidgetLayout() { return R.layout.widget_calendar; }
    @Override
    protected String getDataKey() { return "calendar_events"; }
    @Override
    protected String getCountKey() { return "calendar_count"; }
    @Override
    protected String getDeepLink() { return "familyhub://calendar"; }
    @Override
    protected int getListId() { return R.id.widget_calendar_list; }
    @Override
    protected int getCountId() { return R.id.widget_calendar_count; }
}
