import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:intl/intl.dart';

/// 대시보드 데이터 내보내기 서비스
/// PDF, Excel 형태로 리포트를 생성하고 공유하는 기능을 제공
class ExportService {
  static const String _appName = 'DOT 출근부';
  static final DateFormat _dateFormat = DateFormat('yyyy-MM-dd HH:mm');
  static final DateFormat _fileDateFormat = DateFormat('yyyyMMdd_HHmm');

  /// PDF 리포트 생성 및 공유
  static Future<void> exportToPDF({
    required String title,
    required Map<String, dynamic> data,
    required BuildContext context,
    String? subtitle,
  }) async {
    try {
      final pdf = pw.Document();
      final now = DateTime.now();
      
      // PDF 페이지 생성
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(32),
          header: (context) => _buildPdfHeader(title, subtitle, now),
          footer: (context) => _buildPdfFooter(context),
          build: (context) => _buildPdfContent(data),
        ),
      );

      // 파일 저장
      final output = await _getOutputFile(title, 'pdf');
      final bytes = await pdf.save();
      await output.writeAsBytes(bytes);

      // 파일 공유
      await Share.shareXFiles(
        [XFile(output.path)],
        subject: '$title - $_appName',
        text: '${subtitle ?? title} 리포트입니다.',
      );

    } catch (e) {
      throw Exception('PDF 내보내기 실패: $e');
    }
  }

  /// Excel 리포트 생성 및 공유
  static Future<void> exportToExcel({
    required String title,
    required Map<String, dynamic> data,
    required BuildContext context,
    String? subtitle,
  }) async {
    try {
      final excel = Excel.createExcel();
      final now = DateTime.now();
      
      // 기본 시트 제거 및 새 시트 생성
      excel.delete('Sheet1');
      final sheet = excel['리포트'];
      
      int currentRow = 0;
      
      // 헤더 정보
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow++))
          .value = title;
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow++))
          .value = subtitle ?? '';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow++))
          .value = '생성일시: ${_dateFormat.format(now)}';
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow++))
          .value = ''; // 빈 행
      
      currentRow++;

      // 데이터 섹션별 처리
      for (final entry in data.entries) {
        currentRow = _addExcelSection(sheet, entry.key, entry.value, currentRow);
        currentRow += 2; // 섹션 간 간격
      }

      // 파일 저장
      final output = await _getOutputFile(title, 'xlsx');
      final bytes = excel.encode();
      if (bytes != null) {
        await output.writeAsBytes(bytes);
        
        // 파일 공유
        await Share.shareXFiles(
          [XFile(output.path)],
          subject: '$title - $_appName',
          text: '${subtitle ?? title} 데이터입니다.',
        );
      }

    } catch (e) {
      throw Exception('Excel 내보내기 실패: $e');
    }
  }

  /// 출력 파일 경로 생성
  static Future<File> _getOutputFile(String title, String extension) async {
    final directory = await getTemporaryDirectory();
    final timestamp = _fileDateFormat.format(DateTime.now());
    final fileName = '${title.replaceAll(' ', '_')}_$timestamp.$extension';
    return File('${directory.path}/$fileName');
  }

  /// PDF 헤더 생성
  static pw.Widget _buildPdfHeader(String title, String? subtitle, DateTime now) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 16),
      decoration: const pw.BoxDecoration(
        border: pw.Border(
          bottom: pw.BorderSide(color: PdfColors.black, width: 2),
        ),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text(
                _appName,
                style: pw.TextStyle(
                  fontSize: 24,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                _dateFormat.format(now),
                style: const pw.TextStyle(fontSize: 12),
              ),
            ],
          ),
          pw.SizedBox(height: 8),
          pw.Text(
            title,
            style: pw.TextStyle(
              fontSize: 18,
              fontWeight: pw.FontWeight.bold,
            ),
          ),
          if (subtitle != null) ...[
            pw.SizedBox(height: 4),
            pw.Text(
              subtitle,
              style: const pw.TextStyle(fontSize: 14),
            ),
          ],
        ],
      ),
    );
  }

  /// PDF 푸터 생성
  static pw.Widget _buildPdfFooter(pw.Context context) {
    return pw.Container(
      alignment: pw.Alignment.centerRight,
      margin: const pw.EdgeInsets.only(top: 16),
      padding: const pw.EdgeInsets.only(top: 8),
      decoration: const pw.BoxDecoration(
        border: pw.Border(
          top: pw.BorderSide(color: PdfColors.grey, width: 1),
        ),
      ),
      child: pw.Text(
        '${context.pageNumber} / ${context.pagesCount}',
        style: const pw.TextStyle(fontSize: 10),
      ),
    );
  }

  /// PDF 콘텐츠 생성
  static List<pw.Widget> _buildPdfContent(Map<String, dynamic> data) {
    final widgets = <pw.Widget>[];

    for (final entry in data.entries) {
      widgets.add(
        pw.Container(
          margin: const pw.EdgeInsets.only(bottom: 20),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                entry.key,
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 8),
              _buildPdfDataSection(entry.value),
            ],
          ),
        ),
      );
    }

    return widgets;
  }

  /// PDF 데이터 섹션 생성
  static pw.Widget _buildPdfDataSection(dynamic data) {
    if (data is List) {
      return _buildPdfTable(data);
    } else if (data is Map) {
      return _buildPdfKeyValue(data);
    } else {
      return pw.Text(data.toString());
    }
  }

  /// PDF 테이블 생성
  static pw.Widget _buildPdfTable(List<dynamic> data) {
    if (data.isEmpty) {
      return pw.Text('데이터가 없습니다.');
    }

    // 첫 번째 항목을 기준으로 컬럼 헤더 생성
    final first = data.first;
    List<String> headers = [];
    
    if (first is Map) {
      headers = first.keys.map((key) => key.toString()).toList();
    } else {
      headers = ['값'];
    }

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey, width: 0.5),
      children: [
        // 헤더 행
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey100),
          children: headers.map((header) => 
            pw.Padding(
              padding: const pw.EdgeInsets.all(8),
              child: pw.Text(
                header,
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              ),
            ),
          ).toList(),
        ),
        // 데이터 행들
        ...data.take(100).map((item) => // 최대 100개 행만 표시
          pw.TableRow(
            children: headers.map((header) {
              String value = '';
              if (item is Map && item.containsKey(header)) {
                value = item[header]?.toString() ?? '';
              } else if (headers.length == 1) {
                value = item?.toString() ?? '';
              }
              return pw.Padding(
                padding: const pw.EdgeInsets.all(8),
                child: pw.Text(value, style: const pw.TextStyle(fontSize: 10)),
              );
            }).toList(),
          ),
        ).toList(),
      ],
    );
  }

  /// PDF 키-값 쌍 생성
  static pw.Widget _buildPdfKeyValue(Map<dynamic, dynamic> data) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: data.entries.map((entry) => 
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 4),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Container(
                width: 100,
                child: pw.Text(
                  '${entry.key}:',
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                ),
              ),
              pw.Expanded(
                child: pw.Text(entry.value?.toString() ?? ''),
              ),
            ],
          ),
        ),
      ).toList(),
    );
  }

  /// Excel 섹션 추가
  static int _addExcelSection(Sheet sheet, String sectionName, dynamic data, int startRow) {
    int currentRow = startRow;
    
    // 섹션 헤더
    sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow++))
        .value = sectionName;
    currentRow++;

    if (data is List && data.isNotEmpty) {
      // 리스트 데이터를 테이블로 변환
      final first = data.first;
      if (first is Map) {
        // 헤더 행
        final headers = first.keys.toList();
        for (int i = 0; i < headers.length; i++) {
          sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: currentRow))
              .value = headers[i].toString();
        }
        currentRow++;

        // 데이터 행들
        for (final item in data.take(1000)) { // 최대 1000개 행
          if (item is Map) {
            for (int i = 0; i < headers.length; i++) {
              final value = item[headers[i]]?.toString() ?? '';
              sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: currentRow))
                  .value = value;
            }
            currentRow++;
          }
        }
      }
    } else if (data is Map) {
      // 키-값 쌍으로 표시
      for (final entry in data.entries) {
        sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow))
            .value = entry.key.toString();
        sheet.cell(CellIndex.indexByColumnRow(columnIndex: 1, rowIndex: currentRow))
            .value = entry.value?.toString() ?? '';
        currentRow++;
      }
    } else {
      // 단순 값
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: currentRow++))
          .value = data?.toString() ?? '';
    }

    return currentRow;
  }

  /// 시스템 대시보드 데이터 내보내기
  static Future<void> exportSystemDashboard({
    required Map<String, dynamic> systemStats,
    required List<dynamic> franchiseData,
    required Map<String, dynamic> revenueData,
    required Map<String, dynamic> healthData,
    required BuildContext context,
    required String format, // 'pdf' or 'excel'
  }) async {
    final data = {
      '시스템 통계': systemStats,
      '프랜차이즈 현황': franchiseData,
      '매출 분석': revenueData,
      '시스템 상태': healthData,
    };

    final title = '시스템 대시보드';
    final subtitle = '${DateFormat('yyyy년 MM월 dd일').format(DateTime.now())} 기준';

    if (format.toLowerCase() == 'pdf') {
      await exportToPDF(
        title: title,
        subtitle: subtitle,
        data: data,
        context: context,
      );
    } else {
      await exportToExcel(
        title: title,
        subtitle: subtitle,
        data: data,
        context: context,
      );
    }
  }

  /// 출근 리포트 내보내기
  static Future<void> exportAttendanceReport({
    required Map<String, dynamic> attendanceData,
    required BuildContext context,
    required String format,
    String? period,
  }) async {
    final title = '출근 리포트';
    final subtitle = period ?? '${DateFormat('yyyy년 MM월 dd일').format(DateTime.now())} 기준';

    if (format.toLowerCase() == 'pdf') {
      await exportToPDF(
        title: title,
        subtitle: subtitle,
        data: attendanceData,
        context: context,
      );
    } else {
      await exportToExcel(
        title: title,
        subtitle: subtitle,
        data: attendanceData,
        context: context,
      );
    }
  }
}