// =========================================================================
// i18n.js - Bilingual Internationalization Engine (Khmer 🇰🇭 / English 🇬🇧)
// =========================================================================

(function() {
    'use strict';

    // 1. Current Language State (Default: Khmer 'km', or load from localStorage)
    let currentLang = localStorage.getItem('sys_lang') || 'km';
    if (currentLang !== 'km' && currentLang !== 'en') {
        currentLang = 'km';
    }

    // 2. Comprehensive Dictionary Catalog
    const i18nDict = {
        km: {
            // General & Common
            app_title: "ប្រព័ន្ធគ្រប់គ្រងចំណូលចំណាយកសិដ្ឋាន",
            save: "រក្សាទុក",
            cancel: "បោះបង់",
            delete: "លុប",
            edit: "កែប្រែ",
            search: "ស្វែងរក",
            search_menu: "ស្វែងរកម៉ឺនុយ",
            filter: "តម្រង",
            clear: "សម្អាត",
            print: "បោះពុម្ព",
            export_excel: "ទាញយកជា Excel",
            export_pdf: "ទាញយកជា PDF",
            actions: "សកម្មភាព",
            status: "ស្ថានភាព",
            all: "ទាំងអស់",
            view: "មើល",
            refresh: "ផ្ទុកឡើងវិញ",
            date: "កាលបរិច្ឆេទ",
            category: "ប្រភេទ",
            description: "កំណត់សម្គាល់",
            amount: "ចំនួនទឹកប្រាក់",
            total: "សរុប",
            grand_total: "សរុបរួម",
            cash: "សាច់ប្រាក់",
            bank: "ធនាគារ",
            exchange_rate: "អត្រាប្តូរប្រាក់",
            from_date: "ចាប់ពីថ្ងៃទី",
            to_date: "ដល់ថ្ងៃទី",
            no_data: "គ្មានទិន្នន័យ",
            system_language: "ភាសាប្រព័ន្ធ",
            language: "ភាសា",
            khmer: "ភាសាខ្មែរ",
            english: "English",

            // Navigation Menu
            menu_dashboard: "ទំព័រដើម",
            menu_invoice: "បង្កើតវិក្កយបត្រ",
            menu_invoice_list: "បញ្ជីវិក្កយបត្រ",
            menu_income: "ចំណូល",
            menu_expense: "ចំណាយ",
            menu_reports: "របាយការណ៍",
            menu_reports_summary: "📊 ចំណូលចំណាយ",
            menu_reports_income: "📈 ចំណូល",
            menu_reports_expense: "📉 ចំណាយ",
            menu_employee: "គ្រប់គ្រងបុគ្គលិក",
            menu_employee_list: "📋 បញ្ជីបុគ្គលិក",
            menu_attendance: "📅 គ្រប់គ្រងវត្តមាន",
            menu_attendance_report: "📊 របាយការណ៍វត្តមាន",
            menu_payroll: "💵 បើកប្រាក់បៀវត្សរ៍ (Payroll)",
            menu_settings: "ការកំណត់ទូទៅ",
            menu_settings_categories: "🗂️ ប្រភេទចំណូល/ចំណាយ",
            menu_settings_shifts: "⏰ ម៉ោងធ្វើការ",
            menu_settings_preparers: "📝 អ្នករៀបចំរបាយការណ៍",
            menu_settings_farm_info: "🌾 ព័ត៌មានកសិដ្ឋាន",
            menu_settings_users: "👤 បង្កើតអ្នកប្រើប្រាស់",
            menu_settings_permissions: "🔑 សិទ្ធិអ្នកប្រើប្រាស់",
            menu_settings_roles: "👥 តួនាទីអ្នកប្រើប្រាស់ (System Roles)",
            menu_settings_emp_structure: "🏢 រចនាសម្ព័ន្ធបុគ្គលិក (Emp Structure)",
            menu_settings_branding: "🎨 ការកំណត់យីហោ (Branding)",
            menu_logout: "ចាកចេញ",
            menu_bottom_menu: "ម៉ឺនុយ",

            // Tab Titles
            tab_dashboard: "ទំព័រដើម",
            tab_invoice: "បង្កើតវិក្កយបត្រ",
            tab_invoice_list: "បញ្ជីវិក្កយបត្រ",
            tab_income: "ចំណូល",
            tab_expense: "ចំណាយ",
            tab_reports: "របាយការណ៍",
            tab_employee: "គ្រប់គ្រងបុគ្គលិក",
            tab_attendance: "គ្រប់គ្រងវត្តមាន",
            tab_attendance_report: "របាយការណ៍វត្តមាន",
            tab_payroll: "បើកប្រាក់បៀវត្សរ៍ (Payroll)",
            tab_settings: "ការកំណត់ទូទៅ",

            // Sub Tab Titles
            sub_summary: "ចំណូលចំណាយ",
            sub_income: "ចំណូល",
            sub_expense: "ចំណាយ",
            sub_categories: "ប្រភេទចំណូល/ចំណាយ",
            sub_preparers: "អ្នករៀបចំរបាយការណ៍",
            sub_farm_info: "ព័ត៌មានកសិដ្ឋាន",
            sub_users: "បង្កើតអ្នកប្រើប្រាស់",
            sub_permissions: "សិទ្ធិអ្នកប្រើប្រាស់",
            sub_roles: "តួនាទី",
            sub_emp_structure: "រចនាសម្ព័ន្ធបុគ្គលិក",
            sub_shifts: "ម៉ោងធ្វើការ",
            sub_list: "បញ្ជីបុគ្គលិក",
            sub_attendance: "គ្រប់គ្រងវត្តមាន",
            sub_attendance_report: "របាយការណ៍វត្តមាន",
            sub_payroll: "បើកប្រាក់បៀវត្សរ៍",
            sub_branding: "ការកំណត់យីហោ",

            // Login Screen
            login_title: "Username Login",
            login_subtitle: "Sign in with your system username.",
            login_user_label: "Username",
            login_pass_label: "Password",
            login_remember: "Remember me",
            login_btn: "Sign in",
            login_forgot: "Forgot password ?",
            login_system_access: "System Access",
            login_system_desc: "Contact your administrator if you need to create a new user account.",
            login_contact_btn: "Contact Admin",

            // Dashboard
            monthly_income: "ចំណូលប្រចាំខែ",
            monthly_expense: "ចំណាយប្រចាំខែ",
            monthly_profit: "ប្រាក់ចំណេញប្រចាំខែ",
            hr_overview_title: "ទិដ្ឋភាពទូទៅនៃធនធានមនុស្ស (HR & Workforce)",
            btn_take_attendance: "កត់វត្តមាន",
            btn_manage_staff: "គ្រប់គ្រងបុគ្គលិក",
            kpi_total_workforce: "បុគ្គលិកសរុប (Total Workforce)",
            kpi_today_attendance: "វត្តមានថ្ងៃនេះ (Today's Live Attendance)",
            kpi_est_payroll: "ប៉ាន់ស្មានបៀវត្សរ៍ប្រចាំខែ (Estimated Monthly Payroll)",
            kpi_org_structure: "រចនាសម្ព័ន្ធការងារ (Departments & Structure)",
            chart_dept_distribution: "បែងចែកបុគ្គលិកតាមផ្នែក (Workforce by Department)",
            table_live_attendance: "វត្តមានបុគ្គលិកថ្ងៃនេះ (Today's Live Attendance Monitor)",
            birthday_month: "ខួបកំណើតបុគ្គលិកក្នុងខែនេះ",
            recent_transactions: "ប្រវត្តិប្រតិបត្តិការចុងក្រោយ",
            chart_income_expense: "គំនូសតាងចំណូល-ចំណាយ",
            full_time: "ពេញម៉ោង",
            part_time: "ក្រៅម៉ោង",
            male: "ប្រុស",
            female: "ស្រី",
            staff_count: "នាក់",

            // Transactions & Invoices
            btn_add_income: "+ បញ្ចូលចំណូល",
            btn_add_expense: "+ បញ្ចូលចំណាយ",
            btn_print_report: "ព្រីន របាយការណ៍",
            income_history: "ប្រវត្តិបញ្ចូលចំណូល",
            expense_history: "ប្រវត្តិបញ្ចូលចំណាយ",
            print_income_report: "ព្រីន របាយការណ៍ចំណូល",
            print_expense_report: "ព្រីន របាយការណ៍ចំណាយ",
            download_report_pdf: "ទាញយករបាយការណ៍ជា PDF",
            payment_method: "ប្រភពទូទាត់",
            reference_no: "ឯកសារយោង",
            invoice_info: "ព័ត៌មានវិក្កយបត្រ",
            invoice_no: "លេខវិក្កយបត្រ",
            customer_name: "ឈ្មោះអតិថិជន",
            phone: "លេខទូរស័ព្ទ",
            address: "អាសយដ្ឋាន",
            item_description: "បរិយាយមុខទំនិញ",
            mass_unit: "មាឌ/ឯកតា",
            price_unit: "តម្លៃ/ឯកតា",
            add_item_row: "+ បន្ថែមជួរ",
            deposit_paid: "ប្រាក់កក់",
            balance_due: "ប្រាក់នៅខ្វះ",
            btn_save_print: "រក្សាទុក និង ព្រីន",

            // Employee & HR
            btn_add_employee: "+ បន្ថែមបុគ្គលិក",
            staff_id: "អត្តលេខ",
            staff_name: "ឈ្មោះបុគ្គលិក",
            gender: "ភេទ",
            dob: "ថ្ងៃខែឆ្នាំកំណើត",
            department: "ផ្នែក",
            position: "មុខតំណែង",
            base_salary: "ប្រាក់ខែគោល",
            join_date: "ថ្ងៃចូលធ្វើការ",
            employment_status: "ស្ថានភាពការងារ",
            active: "កំពុងធ្វើការ",
            inactive: "ឈប់ធ្វើការ",

            // Attendance
            daily_attendance: "កត់វត្តមានប្រចាំថ្ងៃ",
            shift_morning: "វេនព្រឹក",
            shift_afternoon: "វេនរសៀល",
            status_present: "វត្តមាន",
            status_leave: "សុំច្បាប់",
            status_absent: "អវត្តមាន",
            status_late: "យឺត",
            status_unmarked: "មិនទាន់កត់",
            btn_save_attendance: "រក្សាទុកវត្តមាន",

            // Payroll
            payroll_batch: "វដ្តបើកប្រាក់បៀវត្សរ៍",
            btn_new_batch: "+ បង្កើតវដ្តថ្មី",
            half_1: "លើកទី ១ (ថ្ងៃទី ០១ ដល់ ១៥)",
            half_2: "លើកទី ២ (ថ្ងៃទី ១៦ ដល់ ដាច់ខែ)",
            btn_calculate_payroll: "គណនាប្រាក់ខែ",
            payslip: "ប័ណ្ណបើកប្រាក់បៀវត្សរ៍",
            prepared_by: "រៀបចំដោយ",
            approved_by: "អនុម័តដោយ",
            net_salary: "ប្រាក់បៀវត្សរ៍សុទ្ធ",
            bank_info: "ព័ត៌មានធនាគារ",

            // Alerts
            alert_success: "ជោគជ័យ!",
            alert_error: "បរាជ័យ!",
            alert_warning: "ការព្រមាន!",
            alert_confirm_delete: "តើអ្នកប្រាកដជាចង់លុបទិន្នន័យនេះមែនទេ?",
            alert_cannot_revert: "ទិន្នន័យដែលលុបហើយមិនអាចត្រឡប់វិញបានទេ!",
            btn_yes_delete: "បាទ/ចាស លុប!",
            saved_successfully: "ទិន្នន័យត្រូវបានរក្សាទុកដោយជោគជ័យ!",
            deleted_successfully: "ទិន្នន័យត្រូវបានលុបដោយជោគជ័យ!"
        },

        en: {
            // General & Common
            app_title: "Farm Income & Expense Management System",
            save: "Save",
            cancel: "Cancel",
            delete: "Delete",
            edit: "Edit",
            search: "Search",
            search_menu: "Search Menu",
            filter: "Filter",
            clear: "Clear",
            print: "Print",
            export_excel: "Export Excel",
            export_pdf: "Export PDF",
            actions: "Actions",
            status: "Status",
            all: "All",
            view: "View",
            refresh: "Refresh",
            date: "Date",
            category: "Category",
            description: "Description",
            amount: "Amount",
            total: "Total",
            grand_total: "Grand Total",
            cash: "Cash",
            bank: "Bank",
            exchange_rate: "Exchange Rate",
            from_date: "From Date",
            to_date: "To Date",
            no_data: "No data available",
            system_language: "System Language",
            language: "Language",
            khmer: "Khmer",
            english: "English",

            // Navigation Menu
            menu_dashboard: "Dashboard",
            menu_invoice: "New Invoice",
            menu_invoice_list: "Invoice List",
            menu_income: "Income",
            menu_expense: "Expense",
            menu_reports: "Reports",
            menu_reports_summary: "📊 Income & Expense",
            menu_reports_income: "📈 Income",
            menu_reports_expense: "📉 Expense",
            menu_employee: "Employee Management",
            menu_employee_list: "📋 Staff List",
            menu_attendance: "📅 Attendance",
            menu_attendance_report: "📊 Attendance Report",
            menu_payroll: "💵 Payroll Management",
            menu_settings: "Settings",
            menu_settings_categories: "🗂️ Categories",
            menu_settings_shifts: "⏰ Work Shifts",
            menu_settings_preparers: "📝 Report Preparers",
            menu_settings_farm_info: "🌾 Farm Info",
            menu_settings_users: "👤 Create Users",
            menu_settings_permissions: "🔑 Permissions",
            menu_settings_roles: "👥 System Roles",
            menu_settings_emp_structure: "🏢 Staff Structure",
            menu_settings_branding: "🎨 Branding",
            menu_logout: "Sign Out",
            menu_bottom_menu: "Menu",

            // Tab Titles
            tab_dashboard: "Dashboard",
            tab_invoice: "New Invoice",
            tab_invoice_list: "Invoice List",
            tab_income: "Income",
            tab_expense: "Expense",
            tab_reports: "Reports",
            tab_employee: "Employees",
            tab_attendance: "Attendance",
            tab_attendance_report: "Attendance Report",
            tab_payroll: "Payroll",
            tab_settings: "Settings",

            // Sub Tab Titles
            sub_summary: "Income & Expense",
            sub_income: "Income",
            sub_expense: "Expense",
            sub_categories: "Categories",
            sub_preparers: "Report Preparers",
            sub_farm_info: "Farm Information",
            sub_users: "Users",
            sub_permissions: "User Permissions",
            sub_roles: "Roles",
            sub_emp_structure: "Employee Structure",
            sub_shifts: "Work Shifts",
            sub_list: "Staff List",
            sub_attendance: "Attendance",
            sub_attendance_report: "Attendance Report",
            sub_payroll: "Payroll",
            sub_branding: "Branding",

            // Login Screen
            login_title: "Username Login",
            login_subtitle: "Sign in with your system username.",
            login_user_label: "Username",
            login_pass_label: "Password",
            login_remember: "Remember me",
            login_btn: "Sign in",
            login_forgot: "Forgot password ?",
            login_system_access: "System Access",
            login_system_desc: "Contact your administrator if you need to create a new user account.",
            login_contact_btn: "Contact Admin",

            // Dashboard
            monthly_income: "Monthly Income",
            monthly_expense: "Monthly Expense",
            monthly_profit: "Monthly Net Profit",
            hr_overview_title: "HR & Workforce Overview",
            btn_take_attendance: "Take Attendance",
            btn_manage_staff: "Manage Staff",
            kpi_total_workforce: "Total Workforce",
            kpi_today_attendance: "Today's Attendance",
            kpi_est_payroll: "Estimated Monthly Payroll",
            kpi_org_structure: "Workforce Structure",
            chart_dept_distribution: "Workforce by Department",
            table_live_attendance: "Today's Live Attendance Monitor",
            birthday_month: "Birthdays This Month",
            recent_transactions: "Recent Transactions",
            chart_income_expense: "Income vs Expense Trend",
            full_time: "Full-Time",
            part_time: "Part-Time",
            male: "Male",
            female: "Female",
            staff_count: "Staff",

            // Transactions & Invoices
            btn_add_income: "+ Add Income",
            btn_add_expense: "+ Add Expense",
            btn_print_report: "Print Report",
            income_history: "Income Records",
            expense_history: "Expense Records",
            print_income_report: "Print Income Report",
            print_expense_report: "Print Expense Report",
            download_report_pdf: "Download Report as PDF",
            payment_method: "Payment Method",
            reference_no: "Reference No.",
            invoice_info: "Invoice Information",
            invoice_no: "Invoice No.",
            customer_name: "Customer Name",
            phone: "Phone Number",
            address: "Address",
            item_description: "Item Description",
            mass_unit: "Mass / Unit",
            price_unit: "Unit Price",
            add_item_row: "+ Add Item",
            deposit_paid: "Deposit Paid",
            balance_due: "Balance Due",
            btn_save_print: "Save & Print",

            // Employee & HR
            btn_add_employee: "+ Add Employee",
            staff_id: "Staff ID",
            staff_name: "Employee Name",
            gender: "Gender",
            dob: "Date of Birth",
            department: "Department",
            position: "Position",
            base_salary: "Base Salary",
            join_date: "Join Date",
            employment_status: "Employment Status",
            active: "Active",
            inactive: "Inactive",

            // Attendance
            daily_attendance: "Daily Attendance",
            shift_morning: "Morning Shift",
            shift_afternoon: "Afternoon Shift",
            status_present: "Present",
            status_leave: "Leave",
            status_absent: "Absent",
            status_late: "Late",
            status_unmarked: "Unmarked",
            btn_save_attendance: "Save Attendance",

            // Payroll
            payroll_batch: "Payroll Batches",
            btn_new_batch: "+ New Batch",
            half_1: "1st Half (01 to 15)",
            half_2: "2nd Half (16 to End of Month)",
            btn_calculate_payroll: "Calculate Payroll",
            payslip: "Employee Payslip",
            prepared_by: "Prepared By",
            approved_by: "Approved By",
            net_salary: "Net Salary",
            bank_info: "Bank Information",

            // Alerts
            alert_success: "Success!",
            alert_error: "Error!",
            alert_warning: "Warning!",
            alert_confirm_delete: "Are you sure you want to delete this record?",
            alert_cannot_revert: "You will not be able to revert this!",
            btn_yes_delete: "Yes, delete it!",
            saved_successfully: "Data saved successfully!",
            deleted_successfully: "Data deleted successfully!"
        }
    };

    // 3. Universal Phrase Table for seamless text replacement across templates
    const phraseMap = {
        km_to_en: {
            "ទំព័រដើម": "Dashboard",
            "បង្កើតវិក្កយបត្រ": "Create Invoice",
            "បញ្ជីវិក្កយបត្រ": "Invoice List",
            "ចំណូល": "Income",
            "ចំណាយ": "Expense",
            "របាយការណ៍": "Reports",
            "ចំណូលចំណាយ": "Income & Expense",
            "📊 ចំណូលចំណាយ": "📊 Income & Expense",
            "📈 ចំណូល": "📈 Income",
            "📉 ចំណាយ": "📉 Expense",
            "គ្រប់គ្រងបុគ្គលិក": "Employee Management",
            "📋 បញ្ជីបុគ្គលិក": "📋 Staff List",
            "📅 គ្រប់គ្រងវត្តមាន": "📅 Daily Attendance",
            "📊 របាយការណ៍វត្តមាន": "📊 Attendance Report",
            "💵 បើកប្រាក់បៀវត្សរ៍ (Payroll)": "💵 Payroll Management",
            "ការកំណត់ទូទៅ": "System Settings",
            "🗂️ ប្រភេទចំណូល/ចំណាយ": "🗂️ Categories",
            "⏰ ម៉ោងធ្វើការ": "⏰ Working Shifts",
            "📝 អ្នករៀបចំរបាយការណ៍": "📝 Report Preparers",
            "🌾 ព័ត៌មានកសិដ្ឋាន": "🌾 Farm Info",
            "👤 បង្កើតអ្នកប្រើប្រាស់": "👤 Create Users",
            "🔑 សិទ្ធិអ្នកប្រើប្រាស់": "🔑 User Permissions",
            "👥 តួនាទីអ្នកប្រើប្រាស់ (System Roles)": "👥 System Roles",
            "🏢 រចនាសម្ព័ន្ធបុគ្គលិក (Emp Structure)": "🏢 Staff Structure",
            "🎨 ការកំណត់យីហោ (Branding)": "🎨 Branding",
            "ចាកចេញ": "Sign Out",
            "ម៉ឺនុយ": "Menu",
            "ស្វែងរកម៉ឺនុយ": "Search Menu",
            "Search Menu": "Search Menu",

            // Dashboard
            "ចំណូលប្រចាំខែ": "Monthly Income",
            "ចំណាយប្រចាំខែ": "Monthly Expense",
            "ប្រាក់ចំណេញប្រចាំខែ": "Monthly Net Profit",
            "សាច់ប្រាក់ (Cash):": "Cash:",
            "ធនាគារ (Bank):": "Bank:",
            "សាច់ប្រាក់": "Cash",
            "ធនាគារ": "Bank",
            "អត្រាប្តូរប្រាក់៖": "Exchange Rate:",
            "ទិដ្ឋភាពទូទៅនៃធនធានមនុស្ស (HR & Workforce)": "HR & Workforce Overview",
            "កត់វត្តមាន": "Take Attendance",
            "គ្រប់គ្រងបុគ្គលិក": "Manage Staff",
            "បុគ្គលិកសរុប (Total Workforce)": "Total Workforce",
            "វត្តមានថ្ងៃនេះ (Today's Live Attendance)": "Today's Live Attendance",
            "ប៉ាន់ស្មានបៀវត្សរ៍ប្រចាំខែ (Estimated Monthly Payroll)": "Estimated Monthly Payroll",
            "រចនាសម្ព័ន្ធការងារ (Departments & Structure)": "Departments & Structure",
            "បែងចែកបុគ្គលិកតាមផ្នែក (Workforce by Department)": "Workforce by Department",
            "វត្តមានបុគ្គលិកថ្ងៃនេះ (Today's Live Attendance Monitor)": "Today's Live Attendance Monitor",
            "ខួបកំណើតបុគ្គលិកក្នុងខែនេះ": "Birthdays This Month",
            "ប្រវត្តិប្រតិបត្តិការចុងក្រោយ": "Recent Transactions",
            "គំនូសតាងចំណូល-ចំណាយ": "Income vs Expense Trend",
            "ពេញម៉ោង": "Full-Time",
            "ក្រៅម៉ោង": "Part-Time",
            "ប្រុស": "Male",
            "ស្រី": "Female",
            "នាក់": "staff",

            // Transactions & Invoices
            "ប្រវត្តិបញ្ចូលចំណូល": "Income Records",
            "ប្រវត្តិបញ្ចូលចំណាយ": "Expense Records",
            "+ បញ្ចូលចំណូល": "+ Add Income",
            "+ បញ្ចូលចំណាយ": "+ Add Expense",
            "ព្រីន របាយការណ៍": "Print Report",
            "ព្រីន របាយការណ៍ចំណូល": "Print Income Report",
            "ព្រីន របាយការណ៍ចំណាយ": "Print Expense Report",
            "ទាញយករបាយការណ៍ជា PDF": "Download Report as PDF",
            "ចាប់ពីថ្ងៃទី (From)": "From Date",
            "ដល់ថ្ងៃទី (To)": "To Date",
            "ចាប់ពីថ្ងៃទី": "From Date",
            "ដល់ថ្ងៃទី": "To Date",
            "សម្អាត": "Clear Filter",
            "កាលបរិច្ឆេទ": "Date",
            "ប្រភេទ": "Category",
            "កំណត់សម្គាល់": "Description",
            "សរុប": "Total",
            "សរុបរួម": "Grand Total",
            "ប្រាក់កក់": "Deposit",
            "ប្រាក់នៅខ្វះ": "Balance Due",
            "ចំនួនទឹកប្រាក់": "Amount",
            "ប្រភពទូទាត់": "Payment Method",
            "វិក្កយបត្រ / បង្កាន់ដៃ": "Receipt / Invoice",
            "ឯកសារយោង": "Reference No.",
            "រក្សាទុក": "Save",
            "បោះបង់": "Cancel",
            "លុប": "Delete",
            "កែប្រែ": "Edit",
            "ព័ត៌មានវិក្កយបត្រ": "Invoice Information",
            "លេខវិក្កយបត្រ": "Invoice Number",
            "ឈ្មោះអតិថិជន": "Customer Name",
            "លេខទូរស័ព្ទ": "Phone Number",
            "អាសយដ្ឋាន": "Address",
            "បញ្ជីមុខទំនិញ": "Item List",
            "មុខទំនិញ": "Item Name",
            "ឯកតា": "Unit",
            "បរិមាណ": "Quantity",
            "តម្លៃរាយ": "Unit Price",
            "+ បន្ថែមជួរ": "+ Add Item Row",
            "រក្សាទុក និង ព្រីន": "Save & Print",

            // Attendance & Payroll
            "កត់វត្តមានប្រចាំថ្ងៃ": "Daily Attendance Entry",
            "វេនព្រឹក (Morning)": "Morning Shift",
            "វេនរសៀល (Afternoon)": "Afternoon Shift",
            "វត្តមាន (Present)": "Present",
            "សុំច្បាប់ (Leave)": "Leave",
            "អវត្តមាន (Absent)": "Absent",
            "យឺត (Late)": "Late",
            "មិនទាន់កត់": "Unmarked",
            "រក្សាទុកវត្តមាន": "Save Attendance",
            "វដ្តទូទាត់ប្រាក់បៀវត្សរ៍": "Payroll Batches",
            "បង្កើតវដ្តថ្មី": "New Payroll Batch",
            "+ បង្កើតវដ្តថ្មី": "+ New Batch",
            "គណនាប្រាក់ខែ": "Calculate Payroll",
            "ប័ណ្ណបើកប្រាក់បៀវត្សរ៍": "Employee Payslip",
            "ព័ត៌មានធនាគារ": "Bank Information",
            "ឈ្មោះធនាគារ": "Bank Name",
            "លេខគណនី": "Account Number",
            "រៀបចំដោយ": "Prepared By",
            "អនុម័តដោយ": "Approved By",
            "ប្រាក់បៀវត្សរ៍សុទ្ធ": "Net Salary",
            "ប្រាក់កាត់អវត្តមាន": "Absence Deduction",
            "ប្រាក់រង្វាន់ / ឧបត្ថម្ភ": "Bonus / Allowance"
        },
        en_to_km: {}
    };

    // Auto-generate inverse mapping (en -> km)
    for (let kmText in phraseMap.km_to_en) {
        let enText = phraseMap.km_to_en[kmText];
        phraseMap.en_to_km[enText] = kmText;
    }

    // 4. Translation Helper Function
    function t(key, fallback = null) {
        const lang = currentLang;
        if (i18nDict[lang] && i18nDict[lang][key]) {
            return i18nDict[lang][key];
        }
        if (lang === 'en' && phraseMap.km_to_en[key]) {
            return phraseMap.km_to_en[key];
        }
        if (lang === 'km' && phraseMap.en_to_km[key]) {
            return phraseMap.en_to_km[key];
        }
        return fallback !== null ? fallback : key;
    }

    // 5. Update Switcher Button States across the UI
    function updateSwitcherButtons() {
        const isKm = currentLang === 'km';

        // Helper to update active classes on button pairs
        function applyBtnState(btnKm, btnEn) {
            if (btnKm && btnEn) {
                if (isKm) {
                    btnKm.classList.add('btn-success', 'text-white', 'active');
                    btnKm.classList.remove('btn-outline-secondary', 'text-muted', 'btn-light');
                    btnEn.classList.remove('btn-primary', 'btn-success', 'text-white', 'active');
                    btnEn.classList.add('text-muted');
                } else {
                    btnEn.classList.add('btn-primary', 'text-white', 'active');
                    btnEn.classList.remove('btn-outline-secondary', 'text-muted', 'btn-light');
                    btnKm.classList.remove('btn-success', 'btn-primary', 'text-white', 'active');
                    btnKm.classList.add('text-muted');
                }
            }
        }

        // Top navbar switchers
        applyBtnState(document.getElementById('lang-btn-km'), document.getElementById('lang-btn-en'));
        // Login screen switchers
        applyBtnState(document.getElementById('login-lang-km'), document.getElementById('login-lang-en'));
        // Sidebar switchers
        applyBtnState(document.getElementById('sidebar-lang-km'), document.getElementById('sidebar-lang-en'));
        // Settings page radio/switchers if available
        const settingKm = document.getElementById('setting-lang-km');
        const settingEn = document.getElementById('setting-lang-en');
        if (settingKm && settingEn) {
            settingKm.checked = isKm;
            settingEn.checked = !isKm;
        }
    }

    // 6. DOM Translation Scanner
    function applyTranslations(root = document) {
        const lang = currentLang;
        document.documentElement.setAttribute('lang', lang);

        // A. Translate elements with data-i18n attribute
        const i18nElements = root.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation && translation !== key) {
                if (el.hasAttribute('data-i18n-html')) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // B. Translate placeholders
        const placeholderElements = root.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) el.placeholder = translation;
        });

        // C. Translate titles / tooltips
        const titleElements = root.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation) el.title = translation;
        });

        // D. Universal Phrase Replacement for Elements Without explicit data-i18n
        const targetSelectors = 'button, h1, h2, h3, h4, h5, h6, th, td, label, .card-title, .nav-link-title, .submenu-link, .dropdown-item, .form-check-label, .badge, a, span, p, small, strong';
        const candidateElements = root.querySelectorAll(targetSelectors);

        candidateElements.forEach(el => {
            // Skip form inputs, text areas, editable areas or explicit ignores
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.hasAttribute('data-no-i18n') || el.closest('.note-editable, [contenteditable="true"]')) {
                return;
            }

            // Only inspect elements with 1 direct text node or simple child text
            for (let child of el.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent.trim();
                    if (!text) continue;

                    if (lang === 'en') {
                        if (phraseMap.km_to_en[text]) {
                            if (!el.hasAttribute('data-i18n-km')) {
                                el.setAttribute('data-i18n-km', text);
                            }
                            child.textContent = child.textContent.replace(text, phraseMap.km_to_en[text]);
                        }
                    } else {
                        // Switch to Khmer
                        if (el.hasAttribute('data-i18n-km')) {
                            const originalKm = el.getAttribute('data-i18n-km');
                            child.textContent = child.textContent.replace(text, originalKm);
                        } else if (phraseMap.en_to_km[text]) {
                            child.textContent = child.textContent.replace(text, phraseMap.en_to_km[text]);
                        }
                    }
                }
            }
        });

        // E. Update Top Navbar Title if auth.js has rendered it
        if (typeof window.updateTopNavbarTitle === 'function') {
            window.updateTopNavbarTitle();
        }

        // F. Update Switcher Buttons
        updateSwitcherButtons();
    }

    // 7. Change Language API
    function setLanguage(newLang) {
        if (newLang !== 'km' && newLang !== 'en') return;
        currentLang = newLang;
        localStorage.setItem('sys_lang', newLang);

        applyTranslations(document);

        // Notify other components via CustomEvent
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: newLang } }));

        // Re-render dashboard or active tab widgets if functions exist
        const activeTab = localStorage.getItem('activeTab') || 'dashboard';
        if (activeTab === 'dashboard' && typeof window.loadData === 'function') {
            setTimeout(window.loadData, 50);
        }
    }

    // 8. Expose to Global Scope
    window.i18n = {
        dict: i18nDict,
        phraseMap: phraseMap,
        t: t,
        setLanguage: setLanguage,
        applyTranslations: applyTranslations,
        get currentLang() { return currentLang; }
    };

    window.t = t;
    window.setLanguage = setLanguage;
    window.applyTranslations = applyTranslations;

    // 9. Initial Execution as soon as DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyTranslations(document);
        });
    } else {
        applyTranslations(document);
    }

})();
