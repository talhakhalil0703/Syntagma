import { useEffect, useMemo } from "react";
import { useCalendarStore } from "./calendarStore";
import { useDailyNotesStore } from "../daily/dailyNotesStore";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import dayjs from "dayjs";

export function CalendarPane() {
    const {
        currentDate, activeDays, isLoading,
        nextMonth, prevMonth, resetToToday, queryActiveDays
    } = useCalendarStore();

    // Auto-refresh when workspace vault path or daily notes setting changes
    const vaultPath = useDailyNotesStore(state => state.folderPath); // any change here we should reload

    useEffect(() => {
        queryActiveDays();
    }, [vaultPath, queryActiveDays]);

    // Generate Calendar Grid
    const calendarGrid = useMemo(() => {
        const startOfMonth = currentDate.startOf('month');
        const endOfMonth = currentDate.endOf('month');

        // Find which day of the week the month starts on (0 = Sunday, 1 = Monday, etc)
        const startDayOfWeek = startOfMonth.day();

        // Find how many days are in the month
        const daysInMonth = endOfMonth.date();

        const grid: (dayjs.Dayjs | null)[] = [];

        // Pad the start of the grid with nulls (empty cells)
        for (let i = 0; i < startDayOfWeek; i++) {
            grid.push(null);
        }

        // Fill in the actual days
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(startOfMonth.date(i));
        }

        return grid;
    }, [currentDate]);

    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const today = dayjs().format("YYYY-MM-DD");

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px' }}>

            {/* Header Control Panel */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '16px'
            }}>
                <button
                    className="icon-btn"
                    onClick={prevMonth}
                    style={{ padding: '4px' }}
                >
                    <ChevronLeft size={16} />
                </button>

                <div
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontWeight: 600, fontSize: '13px',
                        cursor: 'pointer', color: 'var(--text-primary)'
                    }}
                    onClick={resetToToday}
                    title="Reset to Today"
                >
                    {currentDate.format("MMMM YYYY")}
                </div>

                <button
                    className="icon-btn"
                    onClick={nextMonth}
                    style={{ padding: '4px' }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Grid Header (Days of Week) */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px', marginBottom: '8px', textAlign: 'center',
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)'
            }}>
                {weekDays.map(day => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            {/* Calendar Grid Body */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px', flexGrow: 1, alignContent: 'start'
            }}>
                {calendarGrid.map((day, index) => {
                    if (!day) {
                        return <div key={`empty-${index}`} style={{ aspectRatio: '1', padding: '4px' }} />;
                    }

                    const dateStr = day.format("YYYY-MM-DD");
                    const isToday = dateStr === today;
                    const hasNote = activeDays.has(dateStr);

                    return (
                        <div
                            key={dateStr}
                            onClick={() => useDailyNotesStore.getState().openDailyNote(day.toDate())}
                            style={{
                                aspectRatio: '1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: isToday ? 600 : 400,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: isToday ? 'var(--bg-primary)' : (hasNote ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                backgroundColor: isToday ? 'var(--text-accent)' : (hasNote ? 'var(--bg-tertiary)' : 'transparent'),
                                transition: 'all 0.1s ease',
                                border: isToday ? 'none' : '1px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                                if (!isToday) e.currentTarget.style.border = '1px solid var(--text-accent)';
                            }}
                            onMouseLeave={(e) => {
                                if (!isToday) e.currentTarget.style.border = '1px solid transparent';
                            }}
                            title={hasNote ? `Open Note: ${dateStr}` : `Create Note: ${dateStr}`}
                        >
                            {day.date()}
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats Loader */}
            {isLoading && (
                <>
                    <div style={{
                        marginTop: 'auto', textAlign: 'center',
                        fontSize: '11px', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                        <CalendarIcon size={12} className="spin" /> Syncing vault dates...
                    </div>
                </>
            )}
        </div>
    );
}
