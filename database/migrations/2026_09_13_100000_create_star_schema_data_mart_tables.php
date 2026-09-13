<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. TABEL DIMENSI
        
        // Dimensi Waktu
        Schema::create('dim_dates', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->integer('year');
            $table->integer('month');
            $table->integer('quarter');
            $table->integer('day_of_week');
            $table->timestamps();
        });

        // Dimensi Produk
        Schema::create('dim_products', function (Blueprint $table) {
            $table->id();
            $table->string('category', 50); // e.g. Broadband, Digital, Voice
            $table->string('broadband_pack_type', 50)->nullable(); // e.g. Core, Acquisition
            $table->timestamps();
        });

        // Dimensi Tipe Penjualan
        Schema::create('dim_sales_types', function (Blueprint $table) {
            $table->id();
            $table->string('type_name', 50); // BAU / New Sales
            $table->timestamps();
        });

        // Dimensi Wilayah / Lokasi
        Schema::create('dim_locations', function (Blueprint $table) {
            $table->id();
            $table->string('area_name', 100); // e.g. Area 1 Sumatera
            $table->string('region_name', 100); // e.g. Region Sumbagut
            $table->timestamps();
        });

        // Dimensi Metrik Driver
        Schema::create('dim_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('metric_name', 50); // e.g. Playing User, Payload User
            $table->timestamps();
        });

        // 2. TABEL FAKTA

        // Fakta Pendapatan Aktual Harian
        Schema::create('fact_revenues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dim_date_id')->constrained('dim_dates')->cascadeOnDelete();
            $table->foreignId('dim_product_id')->constrained('dim_products')->cascadeOnDelete();
            $table->foreignId('dim_sales_type_id')->constrained('dim_sales_types')->cascadeOnDelete();
            $table->foreignId('dim_location_id')->nullable()->constrained('dim_locations')->nullOnDelete();
            $table->decimal('actual_revenue', 20, 2)->default(0.00);
            $table->timestamps();
        });

        // Fakta Target Pendapatan Bulanan
        Schema::create('fact_targets', function (Blueprint $table) {
            $table->id();
            $table->integer('year');
            $table->integer('month');
            $table->foreignId('dim_sales_type_id')->nullable()->constrained('dim_sales_types')->nullOnDelete();
            $table->foreignId('dim_product_id')->nullable()->constrained('dim_products')->nullOnDelete();
            $table->foreignId('dim_location_id')->nullable()->constrained('dim_locations')->nullOnDelete();
            $table->decimal('target_revenue', 20, 2)->default(0.00);
            $table->timestamps();
        });

        // Fakta Metrik Driver Harian
        Schema::create('fact_drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dim_date_id')->constrained('dim_dates')->cascadeOnDelete();
            $table->foreignId('dim_metric_id')->constrained('dim_metrics')->cascadeOnDelete();
            $table->decimal('value', 20, 2)->default(0.00);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fact_drivers');
        Schema::dropIfExists('fact_targets');
        Schema::dropIfExists('fact_revenues');
        Schema::dropIfExists('dim_metrics');
        Schema::dropIfExists('dim_locations');
        Schema::dropIfExists('dim_sales_types');
        Schema::dropIfExists('dim_products');
        Schema::dropIfExists('dim_dates');
    }
};
