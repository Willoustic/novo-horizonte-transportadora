"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "react-day-picker/locale/pt-BR"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const PT_WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ptBR}
      formatters={{
        formatWeekdayName: (date) => PT_WEEKDAYS[date.getDay()],
      }}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: "absolute left-1",
        button_next: "absolute right-1",
        weekdays: "flex",
        weekday: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        day_button: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        selected: "bg-green-600 text-white hover:bg-green-600 focus:bg-green-600",
        today: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
        outside: "text-gray-400 opacity-50",
        disabled: "text-gray-400 opacity-50",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
