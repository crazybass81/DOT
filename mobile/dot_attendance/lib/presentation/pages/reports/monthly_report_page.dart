import 'package:flutter/material.dart';

class MonthlyReportPage extends StatefulWidget {
  final int? month;
  final int? year;
  
  const MonthlyReportPage({
    super.key,
    this.month,
    this.year,
  });

  @override
  State<MonthlyReportPage> createState() => _MonthlyReportPageState();
}

class _MonthlyReportPageState extends State<MonthlyReportPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Monthly Report'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Monthly Report Page - To be implemented'),
            if (widget.month != null && widget.year != null)
              Text('Month: ${widget.month}, Year: ${widget.year}'),
          ],
        ),
      ),
    );
  }
}