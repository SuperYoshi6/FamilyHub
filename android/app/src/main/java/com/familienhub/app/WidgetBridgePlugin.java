package com.familienhub.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void setShoppingData(PluginCall call) {
        String items = call.getString("items", "");
        String count = call.getString("count", "");
        WidgetProvider.saveWidgetData(getContext(), "shopping_items", items);
        WidgetProvider.saveWidgetData(getContext(), "shopping_count", count);
        call.resolve();
    }

    @PluginMethod
    public void setCalendarData(PluginCall call) {
        String events = call.getString("events", "");
        String count = call.getString("count", "");
        WidgetProvider.saveWidgetData(getContext(), "calendar_events", events);
        WidgetProvider.saveWidgetData(getContext(), "calendar_count", count);
        call.resolve();
    }

    @PluginMethod
    public void setTasksData(PluginCall call) {
        String tasks = call.getString("tasks", "");
        String count = call.getString("count", "");
        WidgetProvider.saveWidgetData(getContext(), "tasks", tasks);
        WidgetProvider.saveWidgetData(getContext(), "tasks_count", count);
        call.resolve();
    }

    @PluginMethod
    public void setMealPlanData(PluginCall call) {
        String meals = call.getString("meals", "");
        String count = call.getString("count", "");
        WidgetProvider.saveWidgetData(getContext(), "mealplan_meals", meals);
        WidgetProvider.saveWidgetData(getContext(), "mealplan_count", count);
        call.resolve();
    }

    @PluginMethod
    public void setMealRequestsData(PluginCall call) {
        String requests = call.getString("requests", "");
        String count = call.getString("count", "");
        WidgetProvider.saveWidgetData(getContext(), "mealrequests", requests);
        WidgetProvider.saveWidgetData(getContext(), "mealrequests_count", count);
        call.resolve();
    }

    @PluginMethod
    public void notifyUpdate(PluginCall call) {
        WidgetProvider.notifyWidgets(getContext());
        call.resolve();
    }
}
