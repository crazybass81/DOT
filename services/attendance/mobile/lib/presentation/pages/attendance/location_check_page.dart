import 'package:flutter/material.dart';

class LocationCheckPage extends StatefulWidget {
  const LocationCheckPage({super.key});

  @override
  State<LocationCheckPage> createState() => _LocationCheckPageState();
}

class _LocationCheckPageState extends State<LocationCheckPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Location Check'),
      ),
      body: const Center(
        child: Text('Location Check Page - To be implemented'),
      ),
    );
  }
}