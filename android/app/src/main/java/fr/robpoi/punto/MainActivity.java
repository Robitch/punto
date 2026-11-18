package fr.robpoi.punto;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Draw behind the system bars; the web pages handle the safe areas.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
