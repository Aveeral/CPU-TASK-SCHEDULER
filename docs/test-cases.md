# Test Cases — Hand-Calculated Expected Results

This file contains textbook scheduling examples with fully worked-out expected outputs.
Tests in `tests/` are written directly from these cases.

---

## TC-1: FCFS — Basic 3-Process

| PID | Arrival | Burst |
|-----|---------|-------|
| P1  | 0       | 24    |
| P2  | 1       | 3     |
| P3  | 2       | 3     |

**Gantt:** `P1[0-24] P2[24-27] P3[27-30]`

| PID | TAT | WT | RT |
|-----|-----|----|----|
| P1  | 24  | 0  | 0  |
| P2  | 26  | 23 | 23 |
| P3  | 28  | 25 | 25 |

Avg WT = 16, Avg TAT = 26

---

## TC-2: FCFS — CPU Idle Gap

| PID | Arrival | Burst |
|-----|---------|-------|
| P1  | 0       | 2     |
| P2  | 5       | 3     |

**Gantt:** `P1[0-2] IDLE[2-5] P2[5-8]`

| PID | TAT | WT | RT |
|-----|-----|----|----|
| P1  | 2   | 0  | 0  |
| P2  | 3   | 0  | 0  |

---

## TC-3: SJF — Non-Preemptive

| PID | Arrival | Burst |
|-----|---------|-------|
| P1  | 0       | 7     |
| P2  | 2       | 4     |
| P3  | 4       | 1     |
| P4  | 5       | 4     |

**Gantt:** `P1[0-7] P3[7-8] P2[8-12] P4[12-16]`

| PID | TAT | WT | RT  |
|-----|-----|----|-----|
| P1  | 7   | 0  | 0   |
| P2  | 10  | 6  | 6   |
| P3  | 4   | 3  | 3   |
| P4  | 11  | 7  | 7   |

Avg WT = 4, Avg TAT = 8

---

## TC-4: SRTF — Preemptive SJF

| PID | Arrival | Burst |
|-----|---------|-------|
| P1  | 0       | 7     |
| P2  | 2       | 4     |
| P3  | 4       | 1     |
| P4  | 5       | 4     |

**Gantt:** `P1[0-2] P2[2-4] P3[4-5] P2[5-7] P4[7-11] P1[11-16]`

| PID | TAT | WT | RT |
|-----|-----|----|----|
| P1  | 16  | 9  | 0  |
| P2  | 5   | 1  | 0  |
| P3  | 1   | 0  | 0  |
| P4  | 6   | 2  | 2  |

Avg WT = 3, Avg TAT = 7

---

## TC-5: Round Robin — Quantum = 4

| PID | Arrival | Burst |
|-----|---------|-------|
| P1  | 0       | 10    |
| P2  | 0       | 6     |
| P3  | 0       | 2     |

**Gantt:** `P1[0-4] P2[4-8] P3[8-10] P1[10-14] P2[14-16] P1[16-18]`

| PID | TAT | WT  | RT |
|-----|-----|-----|----|
| P1  | 18  | 8   | 0  |
| P2  | 16  | 10  | 4  |
| P3  | 10  | 8   | 8  |

---

## TC-6: Priority — Non-Preemptive (lower = higher priority)

| PID | Arrival | Burst | Priority |
|-----|---------|-------|----------|
| P1  | 0       | 10    | 3        |
| P2  | 0       | 1     | 1        |
| P3  | 0       | 2     | 4        |
| P4  | 0       | 1     | 5        |
| P5  | 0       | 5     | 2        |

**Gantt:** `P2[0-1] P5[1-6] P1[6-16] P3[16-18] P4[18-19]`

| PID | TAT | WT |
|-----|-----|----|
| P1  | 16  | 6  |
| P2  | 1   | 0  |
| P3  | 18  | 16 |
| P4  | 19  | 18 |
| P5  | 6   | 1  |

Avg WT = 8.2

---

## TC-7: Edge — Single Process

| PID | Arrival | Burst |
|-----|---------|-------|
| P1  | 0       | 5     |

**Gantt:** `P1[0-5]`  
TAT=5, WT=0, RT=0

---

## TC-8: Edge — Empty Process List

Result: empty Gantt, empty metrics.
