package com.familienhub.app;

public class MealRequestsWidgetProvider extends WidgetProvider {
    @Override
    protected int getWidgetLayout() { return R.layout.widget_mealrequests; }
    @Override
    protected String getDataKey() { return "mealrequests"; }
    @Override
    protected String getCountKey() { return "mealrequests_count"; }
    @Override
    protected String getDeepLink() { return "familyhub://meals"; }
    @Override
    protected int getListId() { return R.id.widget_mealrequests_list; }
    @Override
    protected int getCountId() { return R.id.widget_mealrequests_count; }
}
