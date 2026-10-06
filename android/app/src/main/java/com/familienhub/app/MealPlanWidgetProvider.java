package com.familienhub.app;

public class MealPlanWidgetProvider extends WidgetProvider {
    @Override
    protected int getWidgetLayout() { return R.layout.widget_mealplan; }
    @Override
    protected String getDataKey() { return "mealplan_meals"; }
    @Override
    protected String getCountKey() { return "mealplan_count"; }
    @Override
    protected String getDeepLink() { return "familyhub://meals"; }
    @Override
    protected int getListId() { return R.id.widget_mealplan_list; }
    @Override
    protected int getCountId() { return R.id.widget_mealplan_count; }
}
