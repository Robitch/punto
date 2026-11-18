package fr.robpoi.punto;

import android.os.Bundle;
import android.view.View;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // super.onCreate switches from the launch theme to AppTheme.NoActionBar:
        // edge to edge must be enabled after it, or the window keeps the launch background.
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);

        // No Android "stretch" overscroll: the screens never scroll.
        Bridge bridge = getBridge();
        if (bridge != null) {
            bridge.getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }
}
