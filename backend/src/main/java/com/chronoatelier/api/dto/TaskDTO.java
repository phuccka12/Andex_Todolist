package com.chronoatelier.api.dto;

import com.chronoatelier.api.model.DefinitionOfDone;
import com.chronoatelier.api.model.TimeBox;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {
    private String id;
    private String title;
    private String category;
    private String priority;
    private String colorTheme;
    private String column; // todo, in_progress, in_review, done
    private TimeBox timeBox;
    private String note;
    private Integer progressPercentage;
    private List<DefinitionOfDone> definitionOfDone;
    private String punctualityStatus; // on_track, active_now, overdue, past
}
