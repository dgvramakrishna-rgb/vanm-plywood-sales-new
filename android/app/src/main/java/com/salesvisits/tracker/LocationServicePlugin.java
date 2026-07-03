package com.salesvisits.tracker;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationServicePlugin")
public class LocationServicePlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        Context context = getContext();
        String clientsJson = call.getString("clients", "[]");

        // Save to SharedPreferences so the Service can read it even when app is closed
        SharedPreferences prefs = context.getSharedPreferences("LocationServicePrefs", Context.MODE_PRIVATE);
        prefs.edit().putString("clients", clientsJson).apply();

        try {
            Intent serviceIntent = new Intent(context, LocationService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            JSObject ret = new JSObject();
            ret.put("status", "success");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Context context = getContext();
        try {
            Intent serviceIntent = new Intent(context, LocationService.class);
            context.stopService(serviceIntent);
            JSObject ret = new JSObject();
            ret.put("status", "success");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop service: " + e.getMessage());
        }
    }
}
