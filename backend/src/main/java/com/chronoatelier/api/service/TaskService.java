package com.chronoatelier.api.service;

import com.chronoatelier.api.dto.TaskDTO;
import com.chronoatelier.api.model.DefinitionOfDone;
import com.chronoatelier.api.model.TimeBox;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {
    private final List<TaskDTO> tasksStore = new ArrayList<>();

    public TaskService() {
        // Seed initial data matching JSON Schema in specification
        tasksStore.add(TaskDTO.builder()
                .id("task_01")
                .title("Deep Work: Kiến Trúc Model & Transform Data")
                .category("deep_work")
                .priority("#1 Cốt Lõi")
                .colorTheme("lavender")
                .column("in_progress")
                .timeBox(TimeBox.builder().start("08:30").end("10:00").durationMinutes(90).build())
                .progressPercentage(60)
                .definitionOfDone(List.of(
                        DefinitionOfDone.builder().id("d1").text("Viết xong hàm transform dữ liệu").completed(true).build(),
                        DefinitionOfDone.builder().id("d2").text("Benchmark thời gian phản hồi < 200ms").completed(false).build()
                ))
                .punctualityStatus("past")
                .build());
    }

    public List<TaskDTO> getAllTasks() {
        return tasksStore;
    }

    public TaskDTO createTask(TaskDTO task) {
        if (task.getId() == null) {
            task.setId("task_" + UUID.randomUUID().toString().substring(0, 8));
        }
        tasksStore.add(task);
        return task;
    }

    public TaskDTO completeTask(String id) {
        return tasksStore.stream()
                .filter(t -> t.getId().equals(id))
                .findFirst()
                .map(t -> {
                    t.setColumn("done");
                    t.setPunctualityStatus("past");
                    t.setProgressPercentage(100);
                    if (t.getDefinitionOfDone() != null) {
                        t.getDefinitionOfDone().forEach(d -> d.setCompleted(true));
                    }
                    return t;
                })
                .orElse(null);
    }
}
