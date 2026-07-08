package com.familienhub.app;

public class TasksWidgetProvider extends WidgetProvider {
    @Override
    protected int getWidgetLayout() { return R.layout.widget_tasks; }
    @Override
    protected String getDataKey() { return "tasks"; }
    @Override
    protected String getCountKey() { return "tasks_count"; }
    @Override
    protected String getDeepLink() { return "familyhub://dashboard"; }
    @Override
    protected int getListId() { return R.id.widget_tasks_list; }
    @Override
    protected int getCountId() { return R.id.widget_tasks_count; }
}
