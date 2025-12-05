# Diabetes Management Application - User Manual

## Overview

This is a comprehensive diabetes management web application designed to help patients track their glucose levels, meals, treatments, and communicate with their healthcare team. The application provides real-time monitoring, data visualization, and AI-powered assistance for better diabetes management.

## Key Features

### 1. **Glucose Monitoring**
- **Real-time glucose tracking** with automatic status indicators (Low <70, Normal 70-180, High >180 mg/dL)
- **Interactive glucose trend charts** with multiple time range views:
  - 1 Hour view with hour-by-hour navigation
  - 1 Day, 1 Week, 1 Month, 2 Months, 3 Months views
- **24-hour time format (HH:mm)** for precise time tracking
- **Hour-based navigation** with "Previous hour" and "Next hour" buttons
- **Swipe gestures** for quick navigation through historical data
- **Visual thresholds** showing low and high glucose boundaries
- **Average glucose calculation** for selected time periods

### 2. **Meal Tracking**
- **Meal logging** with name, carbohydrate count, and timestamp
- **Visual meal markers** on glucose charts (orange dots)
- **Integrated meal-glucose correlation** showing meals directly on glucose readings
- **Daily carbohydrate totals** displayed on dashboard
- **Meal history** with complete log of all meals

### 3. **Treatment Management**
- **Treatment logging** for insulin and medications
- **Dose tracking** with unit measurements
- **Treatment type categorization** (insulin, oral medications, etc.)
- **Daily insulin totals** displayed on dashboard
- **Complete treatment history** with timestamps

### 4. **Lab Results**
- **Lab test tracking** (HbA1c, cholesterol, blood pressure, etc.)
- **Historical lab data** with date tracking
- **Lab result visualization** and trends

### 5. **Doctor-Patient Communication**
- **Secure messaging** between patients and doctors
- **Unread message notifications** with badge counters
- **Real-time message updates** (polls every 30 seconds)
- **Care team management** with doctor profiles
- **Doctor assignment** and care team visibility

### 6. **AI Chat Assistant**
- **AI-powered diabetes management advice**
- **24/7 availability** for questions and guidance
- **Context-aware responses** based on user data
- **Educational support** for diabetes management

### 7. **User Authentication & Settings**
- **Secure user registration and login**
- **Profile management** with personal information
- **Diabetes type tracking** (Type 1, Type 2, Gestational, Prediabetes)
- **Age and health information** management
- **Password reset** functionality
- **Multi-language support** (English, Romanian)

### 8. **Doctor Dashboard** (For Healthcare Providers)
- **Patient list management** with search and filtering
- **Patient detail views** with complete health history
- **Glucose trend analysis** for all patients
- **Messaging system** for patient communication
- **Patient onboarding** and assignment
- **Care team coordination**

## Technical Features

### User Interface
- **Dark theme** with slate color scheme for reduced eye strain
- **Responsive design** that works on desktop, tablet, and mobile devices
- **Touch-friendly** with swipe gestures for chart navigation
- **Real-time updates** for messages and notifications
- **Intuitive navigation** with clear visual hierarchy

### Data Visualization
- **Interactive charts** using Recharts library
- **Hover tooltips** showing detailed information
- **Color-coded indicators** for glucose status
- **Reference lines** for low and high thresholds
- **Meal markers** integrated into glucose charts
- **Dynamic scaling** based on data ranges

### Backend Integration
- **Supabase backend** for data storage and authentication
- **Real-time data synchronization**
- **Secure API calls** with user authentication
- **Row-level security** for data privacy
- **Edge functions** for server-side operations

## How to Use

### For Patients

#### Getting Started
1. **Register** with email, password, and personal information
2. **Complete onboarding** by providing diabetes type and age
3. **Add your first glucose reading** using the "Add Reading" button
4. **Log meals** to track carbohydrate intake
5. **Record treatments** including insulin doses

#### Daily Use
1. **Check dashboard** for latest glucose reading and daily statistics
2. **Add glucose readings** throughout the day
3. **Log meals** before or after eating
4. **Record insulin doses** and medications
5. **Review trends** using the interactive chart
6. **Navigate through history** using time range selector or hour navigation
7. **Message your doctor** for questions or concerns
8. **Use AI chat** for immediate diabetes management advice

#### Chart Navigation
- **Select time range** from dropdown (1 Hour, 1 Day, 1 Week, etc.)
- **Use navigation buttons** to move backward/forward in time
- **Swipe left/right** on mobile devices for quick navigation
- **Click "Current hour"** or "Back to Today" to return to present
- **Hover over points** to see detailed glucose and meal information

### For Doctors

#### Patient Management
1. **View patient list** with diabetes type and age badges
2. **Search patients** by name or filter by criteria
3. **Click on patient** to view detailed health information
4. **Review glucose trends** and treatment history
5. **Send messages** to patients for follow-up
6. **Monitor multiple patients** from centralized dashboard

#### Patient Monitoring
1. **Check patient glucose charts** for trends and patterns
2. **Review meal logs** to assess dietary habits
3. **Verify treatment compliance** through treatment logs
4. **Analyze lab results** for long-term health indicators
5. **Provide guidance** through messaging system

## Data Security & Privacy

- **Encrypted data storage** using Supabase
- **Secure authentication** with password hashing
- **Row-level security** ensuring users only access their own data
- **HIPAA-compliant** data handling practices
- **Secure communication** between patients and doctors

## System Requirements

### Supported Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Devices
- Desktop computers (Windows, Mac, Linux)
- Tablets (iPad, Android tablets)
- Smartphones (iOS, Android)

### Internet Connection
- Stable internet connection required
- Minimum 1 Mbps for smooth operation

## Support & Help

### Common Issues
1. **Cannot see glucose data**: Ensure you've added readings and selected the correct time range
2. **Chart not updating**: Refresh the page or check your internet connection
3. **Messages not sending**: Verify you're connected to the internet and try again
4. **Login issues**: Use password reset if you've forgotten your password

### Getting Help
- **AI Chat**: Available 24/7 for immediate assistance
- **Doctor Messages**: Contact your healthcare provider through the messaging system
- **Technical Support**: Contact the development team for technical issues

## Future Enhancements

### Planned Features
1. **Export functionality** for charts and data (PDF, CSV)
2. **Date picker** for jumping to specific dates/hours
3. **Glucose trend indicators** (rising/falling arrows)
4. **Medication reminders** with push notifications
5. **Integration with glucose monitors** (CGM devices)
6. **Advanced analytics** with predictive insights
7. **Family sharing** for caregivers
8. **Appointment scheduling** with doctors

## Version History

### Current Version: 2.0
- ✅ Hour-based navigation with "Previous hour" and "Next hour" buttons
- ✅ 24-hour time format (HH:mm) on X-axis
- ✅ Enhanced meal markers integrated into glucose chart
- ✅ Improved tooltip with meal information and thresholds
- ✅ Dynamic Y-axis scaling (0 to max + 10%)
- ✅ Swipe gestures for mobile navigation
- ✅ Multiple time range views (1 Hour to 3 Months)

### Previous Updates
- Treatment logging system
- Doctor-patient messaging
- Care team management
- AI chat assistant
- Multi-language support
- Lab results tracking

## Credits

**Development Team**: MetaGPT Team (MGX Platform)
**Technology Stack**: React, TypeScript, Tailwind CSS, Shadcn-UI, Recharts, Supabase
**Design**: Modern dark theme with accessibility considerations

---

**Last Updated**: November 28, 2025
**Application Status**: Production Ready
**Build Version**: 1,314.50 kB (optimized)