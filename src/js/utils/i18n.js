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
            cash_subtotal: "សរុបសាច់ប្រាក់",
            bank_subtotal: "សរុបធនាគារ",
            cash: "សាច់ប្រាក់",
            bank: "ធនាគារ",
            exchange_rate: "អត្រាប្តូរប្រាក់",
            from_date: "ចាប់ពីថ្ងៃទី",
            to_date: "ដល់ថ្ងៃទី",
            from_date_label: "ចាប់ពីថ្ងៃទី (From)",
            to_date_label: "ដល់ថ្ងៃទី (To)",
            currency: "រូបិយប័ណ្ណ",
            payment_method: "វិធីទូទាត់ (Payment)",
            cash_method: "សាច់ប្រាក់ (Cash)",
            bank_method: "ធនាគារ (Bank)",
            income_records: "ប្រវត្តិបញ្ចូលចំណូល",
            expense_records: "ប្រវត្តិបញ្ចូលចំណាយ",
            btn_add_income: "+ បញ្ចូលចំណូល",
            btn_add_expense: "+ បញ្ចូលចំណាយ",
            print_report: "ព្រីន របាយការណ៍",
            print_income_report: "ព្រីន របាយការណ៍ចំណូល",
            print_expense_report: "ព្រីន របាយការណ៍ចំណាយ",
            download_report_pdf: "ទាញយករបាយការណ៍ជា PDF",
            enter_direct_income: "បញ្ចូលទិន្នន័យចំណូលផ្ទាល់",
            enter_direct_expense: "បញ្ចូលទិន្នន័យចំណាយផ្ទាល់",
            btn_save_income: "រក្សាទុកចំណូល",
            btn_save_expense: "រក្សាទុកចំណាយ",
            note_income_placeholder: "ឧ. លក់ជ្រូក ៥ក្បាល",
            note_expense_placeholder: "ឧ. ទិញចំណី ៥បាវ",
            no_data: "គ្មានទិន្នន័យ",
            system_language: "ភាសាប្រព័ន្ធ",
            language: "ភាសា",
            khmer: "ភាសាខ្មែរ",
            english: "English",
            theme_light: "ពន្លឺ",
            theme_dark: "ងងឹត",

            // Navigation Menu
            menu_dashboard: "ទំព័រដើម",
            menu_invoice: "បង្កើតវិក្កយបត្រ",
            menu_invoice_list: "បញ្ជីវិក្កយបត្រ",
            menu_income: "ចំណូល",
            menu_expense: "ចំណាយ",
            menu_wallet: "កាបូបលុយចំណាយ",
            menu_reports: "របាយការណ៍",
            menu_reports_summary: "📊 ចំណូលចំណាយ",
            menu_reports_income: "📈 ចំណូល",
            menu_reports_expense: "📉 ចំណាយ",
            menu_employee: "គ្រប់គ្រងបុគ្គលិក",
            menu_employee_list: "📋 បញ្ជីបុគ្គលិក",
            menu_eface: "📸 ស្កែនវត្តមាន E-Face",
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
            menu_settings_telegram: "✈️ Telegram Alert",
            sub_telegram: "ការកំណត់ Telegram",
            menu_settings_gps: "📍 កំណត់ទីតាំង GPS",
            sub_gps: "កំណត់ទីតាំង GPS (Geofencing)",
            tab_eface: "វត្តមាន E-Face",
            sub_eface: "ស្កែនវត្តមាន E-Face",
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
            login_employee_scan_hint: "សម្រាប់បុគ្គលិកស្កែនវត្តមាន (For Attendance Scan)",
            login_employee_scan_btn: "📸 ស្កែនវត្តមាន E-Face (Face Scan)",

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
            exchange_rate_label: "អត្រាប្តូរប្រាក់៖",
            hr_overview: "ទិដ្ឋភាពទូទៅនៃធនធានមនុស្ស",
            hr_overview_desc: "សង្ខេបព័ត៌មានបុគ្គលិក វត្តមានប្រចាំថ្ងៃ និងចំណាយបៀវត្សរ៍ជាក់ស្តែង",
            total_workforce: "បុគ្គលិកសរុប",
            unit_staff: "នាក់",
            unit_departments: "ផ្នែកការងារ",
            workforce_by_dept: "បែងចែកបុគ្គលិកតាមផ្នែក",
            view_all_staff: "មើលបញ្ជីបុគ្គលិកទាំងអស់",
            today_live_attendance: "វត្តមានបុគ្គលិកថ្ងៃនេះ",
            search_ellipsis: "ស្វែងរក...",
            th_employee: "បុគ្គលិក",
            th_dept_pos: "ផ្នែក / មុខតំណែង",
            birthdays_this_month: "ខួបកំណើតក្នុងខែនេះ (Birthdays This Month)៖",
            congratulations: "🎉 អបអរសាទរ",
            est_payroll: "ប៉ាន់ស្មានបៀវត្សរ៍ប្រចាំខែ",
            org_structure: "រចនាសម្ព័ន្ធការងារ",
            today_attendance: "វត្តមានថ្ងៃនេះ",
            th_morning: "ព្រឹក",
            th_afternoon: "រសៀល",

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

            // Invoices Specific
            new_invoice_title: "បង្កើតវិក្កយបត្រ",
            create_invoice_title: "បង្កើតវិក្កយបត្រ",
            edit_invoice_title: "កែប្រែវិក្កយបត្រ",
            invoice_auto_income_note: "ពេលព្រីនវិក្កយបត្រ វានឹងកត់ត្រាចូលជាចំណូលដោយស្វ័យប្រវត្តិ!",
            invoice_no_field: "លេខវិក្កយបត្រ",
            date_field: "កាលបរិច្ឆេទ",
            customer_field: "អតិថិជន",
            phone_field: "លេខទូរស័ព្ទ",
            address_field: "អាសយដ្ឋាន",
            th_item_no: "លេខផលិតផល",
            th_item_desc: "បរិយាយមុខទំនិញ",
            th_mass_unit: "មាឌ/ឯកតា",
            th_price_unit: "តម្លៃ/ឯកតា",
            th_total: "សរុប",
            btn_add_item: "+ បន្ថែមទំនិញ",
            lbl_income_category: "ប្រភេទចំណូល",
            lbl_invoice_currency: "រូបិយប័ណ្ណ",
            currency_khr: "ប្រាក់រៀល (៛)",
            currency_usd: "ដុល្លារ ($)",
            lbl_payment_method: "វិធីទូទាត់",
            method_cash: "សាច់ប្រាក់",
            method_bank: "ធនាគារ",
            lbl_subtotal: "សរុប៖",
            lbl_delivery_fee: "សេវាដឹកជញ្ជូន៖",
            lbl_grand_total: "តម្លៃសរុប៖",
            btn_save_print_invoice: "រក្សាទុកជាចំណូល & ព្រីនវិក្កយបត្រ",
            btn_update_print_invoice: "កែប្រែ & ព្រីនវិក្កយបត្រ",
            btn_cancel_reset: "បោះបង់",
            desc_placeholder: "បរិយាយ...",
            invoice_history_title: "ប្រវត្តិវិក្កយបត្រ",
            search_inv_no: "ស្វែងរកលេខវិក្កយបត្រ",
            search_inv_placeholder: "ឧ. 001",
            btn_clear: "សម្អាត",
            btn_print: "ព្រីន",
            no_invoices_found: "មិនមានទិន្នន័យវិក្កយបត្រទេ",
            alert_at_least_one_item: "សូមបញ្ចូលទំនិញយ៉ាងហោចណាស់មួយ!",
            alert_invoice_saved: "រក្សាទុកវិក្កយបត្រជោគជ័យ!",
            alert_invoice_updated: "កែប្រែវិក្កយបត្រជោគជ័យ!",
            alert_invoice_deleted: "លុបវិក្កយបត្រជោគជ័យ!",
            alert_confirm_delete_invoice: "តើអ្នកពិតជាចង់លុបវិក្កយបត្រនេះមែនទេ? (ទិន្នន័យចំណូលដែលពាក់ព័ន្ធវានឹងត្រូវលុបចោលដូចគ្នា)",

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
            deleted_successfully: "ទិន្នន័យត្រូវបានលុបដោយជោគជ័យ!",

            // Payment Voucher
            menu_voucher: "ប័ណ្ណចំណាយ",
            tab_voucher: "ប័ណ្ណទូទាត់ប្រាក់",
            pv_title: "ប័ណ្ណទូទាត់ប្រាក់",
            pv_cloud_synced: "ភ្ជាប់ Cloud រួចរាល់",
            pv_telegram_auto: "ផ្ញើដំណឹង Telegram ស្វ័យប្រវត្តិ",
            pv_auth_title: "ផ្ទៀងផ្ទាត់បុគ្គលិកទូទាត់ប្រាក់",
            pv_auth_subtitle: "សូមជ្រើសរើសឈ្មោះរបស់អ្នក និងវាយលេខសម្ងាត់ ៤ ខ្ទង់ ដើម្បីចាប់ផ្ដើម",
            pv_select_name: "ជ្រើសរើសឈ្មោះរបស់អ្នក",
            pv_select_name_placeholder: "-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --",
            pv_pin_label: "លេខកូដសម្ងាត់ ៤ ខ្ទង់",
            pv_pin_hint: "វាយលេខសម្ងាត់ ៤ ខ្ទង់ដែល Admin បានផ្ដល់ជូន",
            pv_remember_me: "ចងចាំឈ្មោះខ្ញុំលើទូរស័ព្ទនេះ (លើកក្រោយមិនបាច់វាយ PIN ទៀតទេ)",
            pv_unlock_btn: "ចូលបំពេញប័ណ្ណ",
            pv_prepared_by: "អ្នកបញ្ចូលទិន្នន័យ",
            pv_switch_user: "ប្ដូរអ្នកប្រើ",
            pv_form_title: "ព័ត៌មានប័ណ្ណទូទាត់ប្រាក់",
            pv_form_subtitle: "សូមបំពេញព័ត៌មានខាងក្រោមឱ្យបានត្រឹមត្រូវ",
            pv_date_label: "កាលបរិច្ឆេទ",
            pv_date_hint: "* អាចរើសថ្ងៃមុនៗបាន",
            pv_time_label: "ម៉ោង",
            pv_payee_label: "អ្នកទទួលប្រាក់ / អ្នកផ្គត់ផ្គង់",
            pv_payee_placeholder: "ឧ. ហាងកសិកម្ម ហេង ហេង, លោក សុខា...",
            pv_category_label: "ប្រភេទចំណាយ",
            pv_select_category: "-- ជ្រើសរើសប្រភេទចំណាយ --",
            pv_amount_label: "ចំនួនទឹកប្រាក់ទូទាត់",
            pv_cur_usd: "ដុល្លារ ($)",
            pv_cur_khr: "រៀល (៛)",
            pv_method_label: "វិធីសាស្រ្តទូទាត់",
            pv_method_cash: "សាច់ប្រាក់សុទ្ធ",
            pv_method_bank: "ធនាគារ",
            pv_desc_label: "បរិយាយមុខចំណាយ / មូលហេតុ",
            pv_desc_placeholder: "បញ្ជាក់ពីសម្ភារៈ ឬគោលបំណងទូទាត់...",
            pv_photo_label: "រូបថតវិក្កយបត្រ / បង្កាន់ដៃ",
            pv_photo_btn: "ថតរូបវិក្កយបត្រ ឬជ្រើសរូបភាព",
            pv_photo_hint: "ចុចត្រង់នេះដើម្បីបើកកាមេរ៉ាទូរស័ព្ទ ឬរើសរូបពីវិចិត្រសាល",
            pv_remove_photo: "លុបរូបចេញ",
            pv_retake_photo: "ថតឡើងវិញ",
            pv_save_btn: "រក្សាទុក និងផ្ញើចូល Telegram",
            pv_recent_title: "ប្រវត្តិប័ណ្ណទូទាត់ដែលបានបញ្ចូលថ្មីៗ",
            pv_exchange_rate_note: "អត្រាប្តូរប្រាក់ $1 =",
            pv_rate_label: "អត្រា:",
            pv_no_records_yet: "មិនទាន់មានប័ណ្ណទូទាត់នៅឡើយទេ",
            pv_cannot_load_history: "មិនអាចទាញយកប្រវត្តិបានទេ",
            pv_saving_telegram: "កំពុងរក្សាទុក និងផ្ញើ Telegram...",

            // Wallet Specific
            menu_wallet: "កាបូបលុយចំណាយ",
            menu_voucher: "ប័ណ្ណទូទាត់ (Voucher)",
            wallet_available_balance: "សមតុល្យសរុបក្នុងដៃ",
            wallet_topup_btn: "បញ្ចូលប្រាក់ (Top Up)",
            wallet_pay_btn: "ចំណាយ (Pay)",
            wallet_money_out: "លុយបានចំណាយ",
            wallet_money_out_desc: "សរុបចំណាយជាក់ស្តែងលើកសិដ្ឋាន",
            wallet_money_in: "លុយបានទទួល",
            wallet_money_in_desc: "សរុបលុយដែលបាន Top Up ពីម្ចាស់",
            wallet_custodians_title: "អ្នកកាន់កាបូបលុយ",
            wallet_custodians_hint: "ចុចលើ Avatar ដើម្បី Top Up ភ្លាមៗ",
            wallet_overview: "ទាំងអស់",
            wallet_quick_topup: "+ ដាក់លុយ",
            wallet_activity_feed: "ប្រវត្តិប្រតិបត្តិការ",
            wallet_filter_all: "ទាំងអស់",
            wallet_filter_in: "+ ប្រាក់ចូល",
            wallet_filter_out: "- ប្រាក់ចេញ",
            wallet_all_handlers: "អ្នកកាន់ទាំងអស់",
            wallet_filter_by_date: "ចម្រាញ់តាមកាលបរិច្ឆេទ",
            wallet_clear_filter: "សម្អាត Filter",
            wallet_loading_activity: "កំពុងផ្ទុកទិន្នន័យប្រតិបត្តិការ...",
            wallet_no_tx: "មិនមានប្រតិបត្តិការនៅក្នុងបញ្ជីនេះទេ",
            wallet_no_tx_sub: "រាល់ការបញ្ចូលប្រាក់ ឬការចំណាយ នឹងបង្ហាញនៅទីនេះ",
            wallet_loading_custodians: "កំពុងផ្ទុកបញ្ជីអ្នកកាន់កាបូបលុយ...",
            wallet_receipt: "វិក្កយបត្រ",
            wallet_delete_tx: "លុបប្រតិបត្តិការ",
            wallet_general_expense: "ចំណាយទូទៅ",

            // Wallet Top Up Modal
            wallet_modal_topup_title: "បញ្ចូលប្រាក់បុរេប្រទាន",
            wallet_recipient: "អ្នកទទួលប្រាក់",
            wallet_select_recipient: "-- សូមជ្រើសរើសអ្នកទទួល --",
            wallet_currency: "រូបិយប័ណ្ណ",
            wallet_usd: "ដុល្លារអាមេរិក ($)",
            wallet_khr: "ប្រាក់រៀល (៛)",
            wallet_date: "កាលបរិច្ឆេទ",
            wallet_amount: "ចំនួនទឹកប្រាក់",
            wallet_purpose_note: "កំណត់សម្គាល់ / គោលបំណង",
            wallet_purpose_placeholder: "ឧ. លុយបុរេប្រទានទិញប្រេង និងជីសប្តាហ៍ទី១",
            wallet_send_telegram: "ផ្ញើដំណឹងទៅ Telegram Group",
            wallet_btn_topup_now: "បញ្ចូលប្រាក់ភ្លាម",

            // Wallet Expense Modal
            wallet_modal_expense_title: "កត់ត្រាចំណាយពីកាបូបលុយ",
            wallet_deduct_notice: "ទឹកប្រាក់នឹងកាត់ចេញពីកាបូបលុយរបស់អ្នកដោយស្វ័យប្រវត្ត",
            wallet_current_balance: "សមតុល្យនៅសល់បច្ចុប្បន្ន",
            wallet_exp_category: "ប្រភេទចំណាយ",
            wallet_select_category: "-- សូមជ្រើសរើសប្រភេទ --",
            wallet_exp_currency: "រូបិយប័ណ្ណចំណាយ",
            wallet_payee_supplier: "អ្នកទទួលប្រាក់ / ហាងផ្គត់ផ្គង់",
            wallet_payee_placeholder: "ឧ. ហាងលក់ជីគីមី តាសុខ",
            wallet_receipt_photo: "រូបថតវិក្កយបត្រ / បង្កាន់ដៃ",
            wallet_remove_photo: "លុបរូប",
            wallet_note_desc: "កំណត់សម្គាល់",
            wallet_note_placeholder: "បញ្ជាក់លម្អិតអំពីការទិញ ឬចំណាយ...",
            wallet_sync_system: "កត់ត្រាចូលក្នុងប្រព័ន្ធចំណាយកសិដ្ឋាន",
            wallet_send_tg_receipt: "ផ្ញើដំណឹង និងវិក្កយបត្រទៅ Telegram",
            wallet_btn_pay_now: "កត់ត្រាចំណាយភ្លាម",
            wallet_receipt_modal_title: "រូបថតវិក្កយបត្រ",
            wallet_close: "បិទ"
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
            cash_subtotal: "Cash Subtotal",
            bank_subtotal: "Bank Subtotal",
            cash: "Cash",
            bank: "Bank",
            exchange_rate: "Exchange Rate",
            from_date: "From Date",
            to_date: "To Date",
            from_date_label: "From Date",
            to_date_label: "To Date",
            currency: "Currency",
            payment_method: "Payment Method",
            cash_method: "Cash",
            bank_method: "Bank Transfer",
            income_records: "Income Records",
            expense_records: "Expense Records",
            btn_add_income: "+ Add Income",
            btn_add_expense: "+ Add Expense",
            print_report: "Print Report",
            print_income_report: "Print Income Report",
            print_expense_report: "Print Expense Report",
            download_report_pdf: "Download Report as PDF",
            enter_direct_income: "Direct Income Entry",
            enter_direct_expense: "Direct Expense Entry",
            btn_save_income: "Save Income",
            btn_save_expense: "Save Expense",
            note_income_placeholder: "e.g. Sold 5 pigs",
            note_expense_placeholder: "e.g. Bought 5 bags of feed",
            no_data: "No data available",
            system_language: "System Language",
            language: "Language",
            khmer: "Khmer",
            english: "English",
            theme_light: "Light",
            theme_dark: "Dark",

            // Navigation Menu
            menu_dashboard: "Dashboard",
            menu_invoice: "Create Invoice",
            menu_invoice_list: "Invoice List",
            menu_income: "Income",
            menu_expense: "Expense",
            menu_wallet: "Farm Wallet",
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
            tab_invoice: "Create Invoice",
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
            login_employee_scan_hint: "For Staff Attendance Scan",
            login_employee_scan_btn: "📸 Scan E-Face Attendance",

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
            exchange_rate_label: "Exchange Rate:",
            hr_overview: "HR & Workforce Overview",
            hr_overview_desc: "Staff summary, daily attendance, and real-time payroll expenses",
            total_workforce: "Total Workforce",
            unit_staff: "staff",
            unit_departments: "Departments",
            workforce_by_dept: "Workforce by Department",
            view_all_staff: "View All Staff",
            today_live_attendance: "Today's Live Attendance",
            search_ellipsis: "Search...",
            th_employee: "Staff",
            th_dept_pos: "Department / Position",
            th_morning: "Morning",
            th_afternoon: "Afternoon",
            birthdays_this_month: "Birthdays This Month:",
            congratulations: "🎉 Congratulations",
            est_payroll: "Estimated Monthly Payroll",
            org_structure: "Workforce Structure",
            today_attendance: "Today's Attendance",

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

            // Invoices Specific
            new_invoice_title: "Create Invoice",
            create_invoice_title: "Create Invoice",
            edit_invoice_title: "Edit Invoice",
            invoice_auto_income_note: "When printing invoice, it will be automatically recorded as income!",
            invoice_no_field: "Invoice No.",
            date_field: "Date",
            customer_field: "Customer Name",
            phone_field: "Phone Number",
            address_field: "Address",
            th_item_no: "Item No.",
            th_item_desc: "Description",
            th_mass_unit: "Mass / Unit",
            th_price_unit: "Unit Price",
            th_total: "Total",
            btn_add_item: "+ Add Item",
            lbl_income_category: "Income Category",
            lbl_invoice_currency: "Invoice Currency",
            currency_khr: "Khmer Riel (៛)",
            currency_usd: "US Dollar ($)",
            lbl_payment_method: "Payment Method",
            method_cash: "Cash",
            method_bank: "Bank Transfer",
            lbl_subtotal: "Subtotal:",
            lbl_delivery_fee: "Delivery Fee:",
            lbl_grand_total: "Grand Total:",
            btn_save_print_invoice: "Save as Income & Print Invoice",
            btn_update_print_invoice: "Update & Print Invoice",
            btn_cancel_reset: "Cancel / Reset",
            desc_placeholder: "Description...",
            invoice_history_title: "Invoice History",
            search_inv_no: "Search Invoice No.",
            search_inv_placeholder: "e.g. 001",
            btn_clear: "Clear Filter",
            btn_print: "Print",
            no_invoices_found: "No invoice records found",
            alert_at_least_one_item: "Please add at least one item!",
            alert_invoice_saved: "Invoice saved successfully!",
            alert_invoice_updated: "Invoice updated successfully!",
            alert_invoice_deleted: "Invoice deleted successfully!",
            alert_confirm_delete_invoice: "Are you sure you want to delete this invoice? (Related income transaction will also be deleted)",

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
            menu_eface: "📸 E-Face Attendance",
            tab_eface: "E-Face Attendance",
            sub_eface: "E-Face Attendance",
            menu_settings_telegram: "✈️ Telegram Alert",
            sub_telegram: "Telegram Alert Settings",
            menu_settings_gps: "📍 GPS Geofencing",
            sub_gps: "GPS Geofencing Settings",
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
            deleted_successfully: "Data deleted successfully!",

            // Payment Voucher
            menu_voucher: "Payment Voucher",
            tab_voucher: "Payment Voucher",
            pv_title: "Payment Voucher",
            pv_cloud_synced: "Cloud Synced",
            pv_telegram_auto: "Telegram Auto-Publish",
            pv_auth_title: "Staff Authentication",
            pv_auth_subtitle: "Please select your name and enter your 4-digit PIN to begin",
            pv_select_name: "Select Your Name",
            pv_select_name_placeholder: "-- Please select your name --",
            pv_pin_label: "4-Digit PIN Code",
            pv_pin_hint: "Enter 4-digit PIN provided by Admin",
            pv_remember_me: "Remember me on this phone (Skip PIN next time)",
            pv_unlock_btn: "Unlock Form",
            pv_prepared_by: "Prepared By",
            pv_switch_user: "Switch User",
            pv_form_title: "Payment Voucher Details",
            pv_form_subtitle: "Please fill out the information below accurately",
            pv_date_label: "Date",
            pv_date_hint: "* Past dates can be selected",
            pv_time_label: "Time",
            pv_payee_label: "Payee / Supplier",
            pv_payee_placeholder: "e.g. Heng Heng Agricultural Store, Mr. Sokha...",
            pv_category_label: "Expense Category",
            pv_select_category: "-- Select Expense Category --",
            pv_amount_label: "Payment Amount",
            pv_cur_usd: "USD ($)",
            pv_cur_khr: "KHR (៛)",
            pv_method_label: "Payment Method",
            pv_method_cash: "Cash",
            pv_method_bank: "Bank Transfer",
            pv_desc_label: "Description / Purpose",
            pv_desc_placeholder: "Specify items or payment purpose...",
            pv_photo_label: "Receipt / Bill Photo",
            pv_photo_btn: "Take Photo or Select Image",
            pv_photo_hint: "Tap here to open camera or choose from gallery",
            pv_remove_photo: "Remove Photo",
            pv_retake_photo: "Retake",
            pv_save_btn: "Save & Publish to Telegram",
            pv_recent_title: "Recently Submitted Vouchers",
            pv_exchange_rate_note: "Exchange Rate $1 =",
            pv_rate_label: "Rate:",
            pv_no_records_yet: "No payment vouchers recorded yet",
            pv_cannot_load_history: "Unable to load voucher history",
            pv_saving_telegram: "Saving & publishing to Telegram...",

            // Wallet Specific
            menu_wallet: "Farm Wallet",
            menu_voucher: "Payment Voucher",
            wallet_available_balance: "Available Balance",
            wallet_topup_btn: "Top Up",
            wallet_pay_btn: "Pay Expense",
            wallet_money_out: "Money Out",
            wallet_money_out_desc: "Total actual farm expenses",
            wallet_money_in: "Money In",
            wallet_money_in_desc: "Total float received from owner",
            wallet_custodians_title: "Custodians / Handlers",
            wallet_custodians_hint: "Click avatar to top up instantly",
            wallet_overview: "All",
            wallet_quick_topup: "+ Top Up",
            wallet_activity_feed: "Activity Feed",
            wallet_filter_all: "All",
            wallet_filter_in: "+ Money In",
            wallet_filter_out: "- Money Out",
            wallet_all_handlers: "All Handlers",
            wallet_filter_by_date: "Filter by Date",
            wallet_clear_filter: "Clear Filter",
            wallet_loading_activity: "Loading activity feed...",
            wallet_no_tx: "No transactions in this list",
            wallet_no_tx_sub: "All top-ups and expenses will appear here",
            wallet_loading_custodians: "Loading custodians list...",
            wallet_receipt: "Receipt",
            wallet_delete_tx: "Delete Transaction",
            wallet_general_expense: "General Expense",

            // Wallet Top Up Modal
            wallet_modal_topup_title: "Top Up Wallet Float",
            wallet_recipient: "Recipient Custodian",
            wallet_select_recipient: "-- Select Recipient --",
            wallet_currency: "Currency",
            wallet_usd: "US Dollar ($)",
            wallet_khr: "Khmer Riel (៛)",
            wallet_date: "Date",
            wallet_amount: "Amount",
            wallet_purpose_note: "Purpose / Note",
            wallet_purpose_placeholder: "e.g. Float fund for fuel & fertilizer week 1",
            wallet_send_telegram: "Send alert to Telegram Group",
            wallet_btn_topup_now: "Top Up Now",

            // Wallet Expense Modal
            wallet_modal_expense_title: "Record Wallet Expense",
            wallet_deduct_notice: "Amount will be automatically deducted from your wallet",
            wallet_current_balance: "Current Remaining Balance",
            wallet_exp_category: "Expense Category",
            wallet_select_category: "-- Select Category --",
            wallet_exp_currency: "Expense Currency",
            wallet_payee_supplier: "Paid To / Supplier",
            wallet_payee_placeholder: "e.g. Ta Sok Fertilizer Shop",
            wallet_receipt_photo: "Receipt Photo",
            wallet_remove_photo: "Remove",
            wallet_note_desc: "Description / Note",
            wallet_note_placeholder: "Specify details of purchase or expense...",
            wallet_sync_system: "Record into Farm Expense System",
            wallet_send_tg_receipt: "Send alert & receipt to Telegram",
            wallet_btn_pay_now: "Record Expense Now",
            wallet_receipt_modal_title: "Receipt Photo",
            wallet_close: "Close"
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
            "វត្តមាន E-Face": "E-Face Attendance",
            "ស្កែនវត្តមាន E-Face": "E-Face Attendance",
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
            "ទិដ្ឋភាពទូទៅនៃធនធានមនុស្ស": "HR & Workforce Overview",
            "សង្ខេបព័ត៌មានបុគ្គលិក វត្តមានប្រចាំថ្ងៃ និងចំណាយបៀវត្សរ៍ជាក់ស្តែង": "Staff summary, daily attendance, and real-time payroll expenses",
            "កត់វត្តមាន": "Take Attendance",
            "គ្រប់គ្រងបុគ្គលិក": "Manage Staff",
            "បុគ្គលិកសរុប (Total Workforce)": "Total Workforce",
            "បុគ្គលិកសរុប": "Total Workforce",
            "វត្តមានថ្ងៃនេះ (Today's Live Attendance)": "Today's Live Attendance",
            "វត្តមានថ្ងៃនេះ": "Today's Attendance",
            "ប៉ាន់ស្មានបៀវត្សរ៍ប្រចាំខែ (Estimated Monthly Payroll)": "Estimated Monthly Payroll",
            "ប៉ាន់ស្មានបៀវត្សរ៍ប្រចាំខែ": "Estimated Monthly Payroll",
            "រចនាសម្ព័ន្ធការងារ (Departments & Structure)": "Departments & Structure",
            "រចនាសម្ព័ន្ធការងារ": "Workforce Structure",
            "ផ្នែកការងារ": "Departments",
            "បែងចែកបុគ្គលិកតាមផ្នែក (Workforce by Department)": "Workforce by Department",
            "បែងចែកបុគ្គលិកតាមផ្នែក": "Workforce by Department",
            "មើលបញ្ជីបុគ្គលិកទាំងអស់": "View All Staff",
            "វត្តមានបុគ្គលិកថ្ងៃនេះ (Today's Live Attendance Monitor)": "Today's Live Attendance Monitor",
            "វត្តមានបុគ្គលិកថ្ងៃនេះ": "Today's Live Attendance",
            "ខួបកំណើតបុគ្គលិកក្នុងខែនេះ": "Birthdays This Month",
            "ខួបកំណើតក្នុងខែនេះ (Birthdays This Month)៖": "Birthdays This Month:",
            "🎉 អបអរសាទរ": "🎉 Congratulations",
            "ប្រវត្តិប្រតិបត្តិការចុងក្រោយ": "Recent Transactions",
            "គំនូសតាងចំណូល-ចំណាយ": "Income vs Expense Trend",
            "ពេញម៉ោង": "Full-Time",
            "ក្រៅម៉ោង": "Part-Time",
            "ពន្លឺ": "Light",
            "ងងឹត": "Dark",
            "ប្រុស": "Male",
            "ប្រុស:": "Male:",
            "ស្រី": "Female",
            "ស្រី:": "Female:",
            "នាក់": "staff",
            "ស្វែងរក...": "Search...",
            "បុគ្គលិក": "Staff",
            "ផ្នែក / មុខតំណែង": "Department / Position",
            "ព្រឹក": "Morning",
            "រសៀល": "Afternoon",
            "របាយការណ៍វត្តមាន": "Attendance Report",

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
            "សំអាត": "Clear Filter",
            "កាលបរិច្ឆេទ": "Date",
            "ប្រភេទ": "Category",
            "កំណត់សម្គាល់": "Description",
            "សរុប": "Total",
            "សរុបសាច់ប្រាក់": "Cash Subtotal",
            "សរុបធនាគារ": "Bank Subtotal",
            "សរុបរួម": "Grand Total",
            "បញ្ចូលទិន្នន័យចំណូលផ្ទាល់": "Direct Income Entry",
            "បញ្ចូលទិន្នន័យចំណាយផ្ទាល់": "Direct Expense Entry",
            "រក្សាទុកចំណូល": "Save Income",
            "រក្សាទុកចំណាយ": "Save Expense",
            "រក្សាទុកចំណូល (Update)": "Save Income (Update)",
            "រក្សាទុកចំណាយ (Update)": "Save Expense (Update)",
            "ប្រភេទទិន្នន័យ": "Category",
            "វិធីទូទាត់ (Payment)": "Payment Method",
            "សាច់ប្រាក់ (Cash)": "Cash",
            "ធនាគារ (Bank)": "Bank Transfer",
            "អត្រាប្តូរប្រាក់ (Exchange Rate)": "Exchange Rate",
            "អត្រាប្តូរប្រាក់៖": "Exchange Rate:",
            "* អត្រាប្តូរប្រាក់៖": "* Exchange Rate:",
            "ឧ. លក់ជ្រូក ៥ក្បាល": "e.g. Sold 5 pigs",
            "ឧ. ទិញចំណី ៥បាវ": "e.g. Bought 5 bags of feed",
            "លក់បន្លែ": "Vegetable Sales",
            "លក់ផ្លែឈើ": "Fruit Sales",
            "លក់ផ្អែក": "Fruit Sales",
            "លក់ជ្រូកសាច់": "Pork Sales",
            "លក់កូនជ្រូក": "Piglet Sales",
            "លក់ជី (លាមកជ្រូក)": "Fertilizer Sales",
            "ចំណីជ្រូក": "Pig Feed",
            "ថ្នាំសង្កូវ និងវ៉ាក់សាំង": "Medicine & Vaccines",
            "ប្រាក់ខែបុគ្គលិក": "Staff Salary",
            "ថ្លៃទឹក និងភ្លើង": "Water & Electricity",
            "ថ្លៃដឹកជញ្ជូន": "Transportation",
            "ទិញកូនជ្រូក": "Piglet Purchase",
            "ចំណាយផ្សេងៗ": "Other Expenses",
            "ចំណូលផ្សេងៗ": "Other Income",
            "ផ្សេងៗ": "Other",
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
            "New Invoice": "Create Invoice",
            "ពេលព្រីនវិក្កយបត្រ វានឹងកត់ត្រាចូលជាចំណូលដោយស្វ័យប្រវត្តិ!": "When printing invoice, it will be automatically recorded as income!",

            // Fallback for legacy bracketed phrases
            "បង្កើតវិក្កយបត្រ (Invoice)": "Create Invoice",
            "លេខវិក្កយបត្រ (N°)": "Invoice No.",
            "កាលបរិច្ឆេទ (Date)": "Date",
            "អតិថិជន (Customer)": "Customer Name",
            "លេខទូរស័ព្ទ (Phone)": "Phone Number",
            "អាសយដ្ឋាន (Address)": "Address",
            "លេខផលិតផល (Item)": "Item No.",
            "បរិយាយមុខទំនិញ (Description)": "Description",
            "មាឌ/ឯកតា (Mass/Unit)": "Mass / Unit",
            "តម្លៃ/ឯកតា (Price/Unit)": "Unit Price",
            "សរុប (Total)": "Total",
            "+ បន្ថែមទំនិញ (Add Item)": "+ Add Item",
            "ប្រភេទចំណូល (ពេលកត់ត្រាចូលប្រព័ន្ធ)": "Income Category",
            "រូបិយប័ណ្ណនៃវិក្កយបត្រនេះ": "Invoice Currency",
            "វិធីទូទាត់ (Payment Method)": "Payment Method",
            "សាច់ប្រាក់ (Cash)": "Cash",
            "ធនាគារ (Bank)": "Bank Transfer",
            "សរុប (Subtotal):": "Subtotal:",
            "សេវាដឹកជញ្ជូន (Delivery Fee):": "Delivery Fee:",
            "តម្លៃសរុប (Grand Total):": "Grand Total:",
            "រក្សាទុកជាចំណូល & ព្រីនវិក្កយបត្រ (Save & Print)": "Save as Income & Print Invoice",
            "កែប្រែ & ព្រីនវិក្កយបត្រ (Update & Print)": "Update & Print Invoice",
            "បោះបង់ (Cancel / Reset)": "Cancel / Reset",
            "ប្រវត្តិវិក្កយបត្រ (Invoice History)": "Invoice History",
            "សម្អាត (Clear)": "Clear Filter",
            "ព្រីន (Print)": "Print",
            "សរុបរួម (Grand Total)": "Grand Total",

            // Clean Khmer mappings (Will ensure en -> km maps to clean Khmer without brackets)
            "បង្កើតវិក្កយបត្រ": "Create Invoice",
            "កែប្រែវិក្កយបត្រ": "Edit Invoice",
            "លេខវិក្កយបត្រ": "Invoice No.",
            "កាលបរិច្ឆេទ": "Date",
            "អតិថិជន": "Customer Name",
            "លេខទូរស័ព្ទ": "Phone Number",
            "អាសយដ្ឋាន": "Address",
            "លេខផលិតផល": "Item No.",
            "បរិយាយមុខទំនិញ": "Description",
            "មាឌ/ឯកតា": "Mass / Unit",
            "តម្លៃ/ឯកតា": "Unit Price",
            "សរុប": "Total",
            "+ បន្ថែមទំនិញ": "+ Add Item",
            "ប្រភេទចំណូល": "Income Category",
            "រូបិយប័ណ្ណ": "Invoice Currency",
            "ប្រាក់រៀល (៛)": "Khmer Riel (៛)",
            "ដុល្លារសហរដ្ឋអាមេរិក ($)": "US Dollar ($)",
            "វិធីទូទាត់": "Payment Method",
            "សាច់ប្រាក់": "Cash",
            "ធនាគារ": "Bank Transfer",
            "សរុប៖": "Subtotal:",
            "សេវាដឹកជញ្ជូន៖": "Delivery Fee:",
            "តម្លៃសរុប៖": "Grand Total:",
            "រក្សាទុកជាចំណូល & ព្រីនវិក្កយបត្រ": "Save as Income & Print Invoice",
            "កែប្រែ & ព្រីនវិក្កយបត្រ": "Update & Print Invoice",
            "បោះបង់": "Cancel / Reset",
            "ប្រវត្តិវិក្កយបត្រ": "Invoice History",
            "ស្វែងរកលេខវិក្កយបត្រ": "Search Invoice No.",
            "សម្អាត": "Clear Filter",
            "ព្រីន": "Print",
            "សរុបរួម": "Grand Total",
            "ការបង់ប្រាក់": "Payment Method",

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
            "ប្រាក់រង្វាន់ / ឧបត្ថម្ភ": "Bonus / Allowance",

            // Payment Voucher Phrases
            "ប័ណ្ណចំណាយ": "Payment Voucher",
            "ប័ណ្ណចំណាយ (Voucher)": "Payment Voucher",
            "🧾 ប័ណ្ណចំណាយ (Payment Voucher)": "🧾 Payment Voucher",
            "ប័ណ្ណទូទាត់ប្រាក់": "Payment Voucher",
            "ប័ណ្ណទូទាត់ប្រាក់ (PAYMENT VOUCHER)": "Payment Voucher",
            "ភ្ជាប់ Cloud រួចរាល់": "Cloud Synced",
            "ផ្ញើដំណឹង Telegram ស្វ័យប្រវត្តិ": "Telegram Auto-Publish",
            "ផ្ទៀងផ្ទាត់បុគ្គលិកទូទាត់ប្រាក់": "Staff Authentication",
            "សូមជ្រើសរើសឈ្មោះរបស់អ្នក និងវាយលេខសម្ងាត់ ៤ ខ្ទង់ ដើម្បីចាប់ផ្ដើម": "Please select your name and enter your 4-digit PIN to begin",
            "ជ្រើសរើសឈ្មោះរបស់អ្នក": "Select Your Name",
            "ជ្រើសរើសឈ្មោះរបស់អ្នក (Select Your Name)": "Select Your Name",
            "-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --": "-- Please select your name --",
            "លេខកូដសម្ងាត់ ៤ ខ្ទង់": "4-Digit PIN Code",
            "លេខកូដសម្ងាត់ (4-Digit PIN)": "4-Digit PIN Code",
            "វាយលេខសម្ងាត់ ៤ ខ្ទង់ដែល Admin បានផ្ដល់ជូន": "Enter 4-digit PIN provided by Admin",
            "ចងចាំឈ្មោះខ្ញុំលើទូរស័ព្ទនេះ (លើកក្រោយមិនបាច់វាយ PIN ទៀតទេ)": "Remember me on this phone (Skip PIN next time)",
            "ចូលបំពេញប័ណ្ណ": "Unlock Form",
            "ចូលបំពេញប័ណ្ណ (Unlock Form)": "Unlock Form",
            "អ្នកបញ្ចូលទិន្នន័យ": "Prepared By",
            "អ្នកបញ្ចូលទិន្នន័យ (Prepared By)": "Prepared By",
            "ប្ដូរអ្នកប្រើ": "Switch User",
            "ព័ត៌មានប័ណ្ណទូទាត់ប្រាក់": "Payment Voucher Details",
            "សូមបំពេញព័ត៌មានខាងក្រោមឱ្យបានត្រឹមត្រូវ": "Please fill out the information below accurately",
            "កាលបរិច្ឆេទ": "Date",
            "កាលបរិច្ឆេទចំណាយ": "Date",
            "កាលបរិច្ឆេទចំណាយ (Date)": "Date",
            "* អាចរើសថ្ងៃមុនៗបាន": "* Past dates can be selected",
            "ម៉ោង": "Time",
            "ម៉ោង (Time)": "Time",
            "អ្នកទទួលប្រាក់ / អ្នកផ្គត់ផ្គង់": "Payee / Supplier",
            "អ្នកទទួលប្រាក់/អ្នកផ្គត់ផ្គង់": "Payee / Supplier",
            "អ្នកទទួលប្រាក់ / ហាងផ្គត់ផ្គង់": "Payee / Supplier",
            "អ្នកទទួលប្រាក់ / ហាងផ្គត់ផ្គង់ (Payee / Supplier)": "Payee / Supplier",
            "ប្រភេទចំណាយ": "Expense Category",
            "ប្រភេទចំណាយ (Expense Category)": "Expense Category",
            "-- ជ្រើសរើសប្រភេទចំណាយ --": "-- Select Expense Category --",
            "ចំនួនទឹកប្រាក់ទូទាត់": "Payment Amount",
            "ចំនួនទឹកប្រាក់ទូទាត់ (Amount)": "Payment Amount",
            "ដុល្លារ ($)": "USD ($)",
            "រៀល (៛)": "KHR (៛)",
            "វិធីសាស្រ្តទូទាត់": "Payment Method",
            "វិធីសាស្រ្តទូទាត់ (Payment Method)": "Payment Method",
            "សាច់ប្រាក់សុទ្ធ": "Cash",
            "សាច់ប្រាក់សុទ្ធ (Cash)": "Cash",
            "ធនាគារ": "Bank Transfer",
            "ធនាគារ (Bank Transfer)": "Bank Transfer",
            "បរិយាយមុខចំណាយ / មូលហេតុ": "Description / Purpose",
            "បរិយាយមុខចំណាយ / មូលហេតុ (Description)": "Description / Purpose",
            "រូបថតវិក្កយបត្រ / បង្កាន់ដៃ": "Receipt / Bill Photo",
            "រូបថតវិក្កយបត្រ / បង្កាន់ដៃ (Receipt / Bill Photo)": "Receipt / Bill Photo",
            "ថតរូបវិក្កយបត្រ ឬជ្រើសរូបភាព": "Take Photo or Select Image",
            "ចុចត្រង់នេះដើម្បីបើកកាមេរ៉ាទូរស័ព្ទ ឬរើសរូបពីវិចិត្រសាល": "Tap here to open camera or choose from gallery",
            "លុបរូបចេញ": "Remove Photo",
            "ថតឡើងវិញ": "Retake",
            "រក្សាទុក និងផ្ញើចូល Telegram": "Save & Publish to Telegram",
            "រក្សាទុក និងផ្ញើចូល Telegram (Save & Publish)": "Save & Publish to Telegram",
            "ប្រវត្តិប័ណ្ណទូទាត់ដែលបានបញ្ចូលថ្មីៗ": "Recently Submitted Vouchers",
            "មិនទាន់មានប័ណ្ណទូទាត់នៅឡើយទេ": "No payment vouchers recorded yet",

            // Wallet Phrases
            "កាបូបលុយចំណាយ": "Farm Wallet",
            "កាបូបលុយ": "Farm Wallet",
            "Farm Wallet": "Farm Wallet",
            "ប័ណ្ណទូទាត់ (Voucher)": "Payment Voucher",
            "សមតុល្យសរុបក្នុងដៃ": "Available Balance",
            "សមតុល្យសរុបក្នុងដៃ (Available Balance)": "Available Balance",
            "លុយបានចំណាយ": "Money Out",
            "លុយបានចំណាយ (Money Out)": "Money Out",
            "លុយបានទទួល": "Money In",
            "លុយបានទទួល (Money In)": "Money In",
            "សរុបចំណាយជាក់ស្តែងលើកសិដ្ឋាន": "Total actual farm expenses",
            "សរុបលុយដែលបាន Top Up ពីម្ចាស់": "Total float received from owner",
            "អ្នកកាន់កាបូបលុយ": "Custodians / Handlers",
            "អ្នកកាន់កាបូបលុយ (Custodians / Handlers)": "Custodians / Handlers",
            "ចុចលើ Avatar ដើម្បី Top Up ភ្លាមៗ": "Click avatar to top up instantly",
            "ប្រវត្តិប្រតិបត្តិការ": "Activity Feed",
            "ប្រវត្តិប្រតិបត្តិការ (Activity Feed)": "Activity Feed",
            "អ្នកកាន់ទាំងអស់": "All Handlers",
            "អ្នកកាន់ទាំងអស់ (All Handlers)": "All Handlers",
            "អ្នកកាន់ទាំងអស់ (All Handler)": "All Handlers",
            "ចម្រាញ់តាមកាលបរិច្ឆេទ": "Filter by Date",
            "សម្អាត Filter": "Clear Filter",
            "+ ប្រាក់ចូល": "+ Money In",
            "- ប្រាក់ចេញ": "- Money Out",
            "+ ដាក់លុយ": "+ Top Up",
            "បញ្ចូលប្រាក់បុរេប្រទាន": "Wallet Top Up",
            "បញ្ចូលប្រាក់បុរេប្រទាន (Top Up)": "Wallet Top Up",
            "បញ្ចូលប្រាក់បុរេប្រទាន (Top Up Wallet)": "Top Up Wallet Float",
            "កត់ត្រាចំណាយពីកាបូបលុយ": "Record Wallet Expense",
            "កត់ត្រាចំណាយពីកាបូបលុយ (Pay Expense)": "Record Wallet Expense",
            "ទឹកប្រាក់នឹងកាត់ចេញពីកាបូបលុយរបស់អ្នកដោយស្វ័យប្រវត្ត": "Amount will be automatically deducted from your wallet",
            "សមតុល្យនៅសល់បច្ចុប្បន្ន": "Current Remaining Balance",
            "ប្រភេទចំណាយ (Expense Category)": "Expense Category",
            "រូបិយប័ណ្ណចំណាយ (Currency)": "Expense Currency",
            "អ្នកទទួលប្រាក់ / ហាងផ្គត់ផ្គង់ (Paid To / Supplier)": "Paid To / Supplier",
            "រូបថតវិក្កយបត្រ / បង្កាន់ដៃ (Receipt Photo)": "Receipt Photo",
            "កំណត់សម្គាល់ (Description / Note)": "Description / Note",
            "កត់ត្រាចូលក្នុងប្រព័ន្ធចំណាយកសិដ្ឋាន (System Expense)": "Record into Farm Expense System",
            "ផ្ញើដំណឹង និងវិក្កយបត្រទៅ Telegram": "Send alert & receipt to Telegram",
            "កត់ត្រាចំណាយភ្លាម": "Record Expense Now",
            "បញ្ចូលប្រាក់ភ្លាម": "Top Up Now",
            "អ្នកទទួលប្រាក់ (Recipient Custodian)": "Recipient Custodian",
            "រូបថតវិក្កយបត្រ (Receipt)": "Receipt Photo",
            "លុបរូប": "Remove",
            "ចំណាយ (Pay)": "Pay Expense",
            "មិនមានប្រតិបត្តិការនៅក្នុងបញ្ជីនេះទេ": "No transactions in this list",
            "រាល់ការបញ្ចូលប្រាក់ ឬការចំណាយ នឹងបង្ហាញនៅទីនេះ": "All top-ups and expenses will appear here",
            "កំពុងផ្ទុកទិន្នន័យប្រតិបត្តិការ...": "Loading activity feed...",
            "កំពុងផ្ទុកបញ្ជីអ្នកកាន់កាបូបលុយ...": "Loading custodians list..."
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
        if (!root) return;
        if (root.nodeType === Node.ELEMENT_NODE && (root.hasAttribute('data-no-i18n') || root.id === 'print-area-invoice' || root.classList.contains('print-container') || (root.closest && root.closest('[data-no-i18n], .print-container, #print-area-invoice')))) {
            return;
        }

        const lang = currentLang;
        document.documentElement.setAttribute('lang', lang);

        // A. Translate elements with data-i18n attribute
        const i18nElements = root.querySelectorAll('[data-i18n]');
        i18nElements.forEach(el => {
            if (el.closest('[data-no-i18n], .print-container, #print-area-invoice')) return;
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
            if (el.closest('[data-no-i18n], .print-container, #print-area-invoice')) return;
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) el.placeholder = translation;
        });

        // C. Translate titles / tooltips
        const titleElements = root.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            if (el.closest('[data-no-i18n], .print-container, #print-area-invoice')) return;
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation) el.title = translation;
        });

        // D. Universal Phrase Replacement for Elements Without explicit data-i18n
        const targetSelectors = 'button, h1, h2, h3, h4, h5, h6, th, td, label, .card-title, .nav-link-title, .submenu-link, .dropdown-item, .form-check-label, .badge, a, span, p, small, strong';
        const candidateElements = root.querySelectorAll(targetSelectors);

        candidateElements.forEach(el => {
            // Skip form inputs, text areas, editable areas, print areas, explicit ignores, or elements already handled by data-i18n
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || 
                el.hasAttribute('data-no-i18n') || el.hasAttribute('data-i18n') || 
                el.closest('[data-no-i18n], .print-container, #print-area-invoice, .note-editable, [contenteditable="true"]')) {
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
                        if (phraseMap.en_to_km[text]) {
                            child.textContent = child.textContent.replace(text, phraseMap.en_to_km[text]);
                        } else if (el.hasAttribute('data-i18n-km')) {
                            const originalKm = el.getAttribute('data-i18n-km');
                            const enEquivalent = phraseMap.km_to_en[originalKm];
                            const cleanKm = enEquivalent && phraseMap.en_to_km[enEquivalent] ? phraseMap.en_to_km[enEquivalent] : originalKm;
                            child.textContent = child.textContent.replace(text, cleanKm);
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
        if (typeof window.updateThemeButtons === 'function') {
            window.updateThemeButtons();
        }
    }

    // 7. Change Language API
    function setLanguage(newLang) {
        if (newLang !== 'km' && newLang !== 'en') return;
        currentLang = newLang;
        localStorage.setItem('sys_lang', newLang);

        applyTranslations(document);

        // Notify other components via CustomEvent
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: newLang } }));

        // Re-render dashboard, income, expense, invoices and widgets
        if (typeof window.loadData === 'function') {
            setTimeout(window.loadData, 50);
        }
        if (typeof window.loadEmployeeDashboardWidgets === 'function') {
            setTimeout(window.loadEmployeeDashboardWidgets, 60);
        }
        if (typeof window.loadInvoices === 'function') {
            setTimeout(window.loadInvoices, 50);
        }
        if (typeof window.loadWalletData === 'function') {
            setTimeout(window.loadWalletData, 50);
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
