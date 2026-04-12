package com.familienhub.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * FCM-Payload nutzt channel_id "familyhub_notifications" – Kanal muss existieren (Android 8+).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "familyhub_notifications",
                    "FamilyHub",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Mitteilungen von FamilyHub");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }
}
