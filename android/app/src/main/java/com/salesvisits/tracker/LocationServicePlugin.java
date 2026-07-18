package com.salesvisits.tracker;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
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

    @PluginMethod
    public void checkBatteryOptimization(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean isIgnoring = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (pm != null) {
                    isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
                }
            } else {
                isIgnoring = true; // Not applicable on older versions
            }
            ret.put("isIgnored", isIgnoring);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check battery optimization status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        Context context = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    Intent intent = new Intent();
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                }
            }
            JSObject ret = new JSObject();
            ret.put("status", "requested");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request battery optimization override: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkExactAlarmPermission(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        try {
            boolean hasPermission = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    hasPermission = alarmManager.canScheduleExactAlarms();
                }
            }
            ret.put("hasPermission", hasPermission);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check exact alarm permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        Context context = getContext();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("status", "requested");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request exact alarm permission: " + e.getMessage());
        }
    }
}
