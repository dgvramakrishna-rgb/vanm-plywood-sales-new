package com.salesvisits.tracker;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.SystemClock;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

public class LocationService extends Service implements LocationListener {

    private static final String CHANNEL_ID = "location_service_channel";
    private static final String DETECT_CHANNEL_ID = "client_detection_channel";
    private static final int FOREGROUND_ID = 1001;

    private LocationManager locationManager;
    private static final Map<String, Long> lastAlertTimes = new HashMap<>();

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
        startForegroundService();
        initLocationUpdates();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Refresh locations when service is started/updated
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // Channel for foreground service persistent notification
                NotificationChannel serviceChannel = new NotificationChannel(
                        CHANNEL_ID,
                        "Location Monitor Service",
                        NotificationManager.IMPORTANCE_LOW
                );
                serviceChannel.setDescription("Keeps proximity detection alive in the background");
                manager.createNotificationChannel(serviceChannel);

                // Channel for high-priority client proximity alerts
                NotificationChannel alertChannel = new NotificationChannel(
                        DETECT_CHANNEL_ID,
                        "Client Proximity Alerts",
                        NotificationManager.IMPORTANCE_HIGH
                );
                alertChannel.setDescription("Alerts when clients are within a 100m radius");
                alertChannel.enableVibration(true);
                manager.createNotificationChannel(alertChannel);
            }
        }
    }

    private void startForegroundService() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("Client Proximity Monitor")
                .setContentText("Actively monitoring client locations in background...")
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(FOREGROUND_ID, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(FOREGROUND_ID, builder.build());
        }
    }

    private void initLocationUpdates() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (locationManager == null) return;

        try {
            // Request updates from GPS
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        5000, // 5 seconds
                        10,   // 10 meters
                        this
                );
            }
            // Request updates from Network/Cellular
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        5000, // 5 seconds
                        10,   // 10 meters
                        this
                );
            }
        } catch (SecurityException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            checkProximity(location);
        }
    }

    private void checkProximity(Location currentLoc) {
        SharedPreferences prefs = getSharedPreferences("LocationServicePrefs", MODE_PRIVATE);
        String clientsJson = prefs.getString("clients", "[]");
        try {
            JSONArray array = new JSONArray(clientsJson);
            for (int i = 0; i < array.length(); i++) {
                JSONObject client = array.getJSONObject(i);
                
                // Only consider active clients
                boolean isCompleted = client.optBoolean("isCompleted", false);
                if (isCompleted) continue;

                double clientLat = client.optDouble("latitude", Double.NaN);
                double clientLng = client.optDouble("longitude", Double.NaN);
                if (Double.isNaN(clientLat) || Double.isNaN(clientLng)) {
                    continue;
                }

                float[] results = new float[1];
                Location.distanceBetween(
                        currentLoc.getLatitude(),
                        currentLoc.getLongitude(),
                        clientLat,
                        clientLng,
                        results
                );
                float distance = results[0];

                if (distance <= 100.0f) { // Within 100 meters
                    String mobile = client.optString("clientMobile", "");
                    String name = client.optString("clientName", "Client");
                    String address = client.optString("address", "");

                    long lastAlert = lastAlertTimes.containsKey(mobile) ? lastAlertTimes.get(mobile) : 0L;
                    long now = System.currentTimeMillis();
                    // Alert once every 5 minutes per client to avoid spam
                    if (now - lastAlert > 300000) { 
                        lastAlertTimes.put(mobile, now);
                        triggerClientNotification(name, address, mobile, distance);
                        playBeep();
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void triggerClientNotification(String name, String address, String mobile, float distance) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String message = name + " is " + Math.round(distance) + "m away at " + address + " (" + mobile + ")";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, DETECT_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Client Detected Nearby!")
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        manager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private void playBeep() {
        try {
            ToneGenerator toneGen = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100);
            toneGen.startTone(ToneGenerator.TONE_CDMA_PIP, 3000); // Plays for exactly 3000ms (3 seconds)
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Intent restartServiceIntent = new Intent(getApplicationContext(), LocationServiceReceiver.class);
        restartServiceIntent.setAction("com.salesvisits.tracker.RESTART_SENSOR_SERVICE");
        PendingIntent restartServicePendingIntent = PendingIntent.getBroadcast(
                getApplicationContext(),
                1,
                restartServiceIntent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager alarmService = (AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmService != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmService.setExactAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + 1000,
                        restartServicePendingIntent
                );
            } else {
                alarmService.set(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        SystemClock.elapsedRealtime() + 1000,
                        restartServicePendingIntent
                );
            }
        }
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}
}
