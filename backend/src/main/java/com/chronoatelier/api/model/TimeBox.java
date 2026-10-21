package com.chronoatelier.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeBox {
    private String start;
    private String end;
    private Integer durationMinutes;
}
