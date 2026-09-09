# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# ─────────────────────────────────────────────────────────────────────────────
# أرقام الأسطر في آثار الأعطال.
#
# `minifyEnabled = true` في نسخة الإصدار، فبلا هذين السطرين يصل عطل من هاتف
# محامٍ بلا اسم ملف ولا رقم سطر — أثرٌ لا يُقرأ ولا يُعاد إنتاجه، والعطل على
# جهاز بعيد لا يُشخَّص إلا من أثره.
#
# `renamesourcefileattribute` يُبقي أرقام الأسطر ويُخفي أسماء الملفات الأصلية،
# فلا يُهدر التعتيم. وفكّ التعتيم يتم بملف الخرائط:
#   android/app/build/outputs/mapping/release/mapping.txt
# يُرفع إلى Play Console مع كل إصدار — وهو ملف حسّاس لا يدخل المستودع.
#
# التوصية القياسية من Google، وشرطُ أي تشخيص عن بُعد.
# ─────────────────────────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
