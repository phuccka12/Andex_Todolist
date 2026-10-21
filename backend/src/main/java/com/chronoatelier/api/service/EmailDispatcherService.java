package com.chronoatelier.api.service;

import com.chronoatelier.api.dto.PostcardEmailRequest;
import org.springframework.stereotype.Service;

@Service
public class EmailDispatcherService {

    public boolean dispatchPostcardEmail(PostcardEmailRequest request) {
        // Log & mock email dispatch process for 06:30 Sunrise & 22:00 Sunset postcards
        System.out.println("💌 [Artisan Email Dispatcher] Sending " + request.getType() + " postcard to " + request.getRecipient());
        System.out.println("📜 Haiku Poem: " + request.getHaiku());
        return true;
    }
}
