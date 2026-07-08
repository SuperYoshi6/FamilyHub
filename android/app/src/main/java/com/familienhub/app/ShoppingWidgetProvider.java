package com.familienhub.app;

public class ShoppingWidgetProvider extends WidgetProvider {
    @Override
    protected int getWidgetLayout() { return R.layout.widget_shopping; }
    @Override
    protected String getDataKey() { return "shopping_items"; }
    @Override
    protected String getCountKey() { return "shopping_count"; }
    @Override
    protected String getDeepLink() { return "familyhub://lists"; }
    @Override
    protected int getListId() { return R.id.widget_shopping_list; }
    @Override
    protected int getCountId() { return R.id.widget_shopping_count; }
}
