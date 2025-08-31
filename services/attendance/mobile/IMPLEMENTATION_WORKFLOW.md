# QR 기반 근태관리 시스템 구현 워크플로우
## 10분 단위 작업 계획서

### 📋 전체 구현 개요
- **총 예상 시간**: 5-8시간 (30-48개 작업 단위)
- **작업 방식**: 10분 단위 집중 작업
- **체크포인트**: 각 Phase 완료 시 테스트 및 검증

---

## 🚀 PHASE 1: 인증 및 QR 시스템 (2-3시간)
### 목표: 마스터 어드민 로그인, QR 생성/저장, 사용자 등록/토큰

#### **Session 1: 마스터 어드민 로그인 UI** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 0:00-0:10 | 마스터 어드민 로그인 페이지 UI 구성 | `lib/presentation/pages/auth/master_admin_login_page.dart` | ⬜ |
| 0:10-0:20 | 로그인 폼 검증 및 에러 처리 추가 | 위 파일 계속 | ⬜ |
| 0:20-0:30 | Neo-brutal 테마 적용 및 UI 완성 | 위 파일 완성 | ⬜ |

#### **Session 2: 어드민 인증 백엔드** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 0:30-0:40 | Admin auth provider 생성 | `lib/presentation/providers/admin_auth_provider.dart` | ⬜ |
| 0:40-0:50 | JWT 토큰 처리 및 secure storage 연동 | `lib/core/services/secure_storage_service.dart` 수정 | ⬜ |
| 0:50-1:00 | Admin role guard 구현 | `lib/core/auth/admin_role_guard.dart` | ⬜ |

#### **Session 3: QR 코드 생성 기능** (40분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 1:00-1:10 | QR 생성 페이지 UI 구성 | `lib/presentation/pages/admin/qr_generator_page.dart` 수정 | ⬜ |
| 1:10-1:20 | Branch 정보 입력 폼 추가 | 위 파일 계속 | ⬜ |
| 1:20-1:30 | QR 생성 로직 구현 (고정 QR) | `lib/core/services/qr_service.dart` 수정 | ⬜ |
| 1:30-1:40 | QR 이미지 저장 및 다운로드 기능 | `lib/core/services/export_service.dart` 활용 | ⬜ |

#### **Session 4: 사용자 등록 플로우** (50분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 1:40-1:50 | QR 스캔 후 등록 체크 로직 | `lib/presentation/pages/attendance/qr_scanner_page.dart` | ⬜ |
| 1:50-2:00 | 사용자 등록 페이지 UI | `lib/presentation/pages/auth/register_page.dart` (신규) | ⬜ |
| 2:00-2:10 | 등록 폼 검증 (이름, 전화, 이메일, 생년월일) | 위 파일 계속 | ⬜ |
| 2:10-2:20 | Device ID 생성 및 저장 | `lib/core/services/device_service.dart` (신규) | ⬜ |
| 2:20-2:30 | 토큰 발급 및 자동 로그인 처리 | `lib/presentation/providers/auth_provider.dart` 수정 | ⬜ |

---

## ⚡ PHASE 2: 근태 핵심 기능 (2-3시간)
### 목표: 자동 출근, 실시간 카운팅, 휴게/퇴근

#### **Session 5: 자동 출근 시스템** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 2:30-2:40 | 대시보드 진입 시 출근 상태 체크 | `lib/presentation/pages/dashboard/user_dashboard_page.dart` | ⬜ |
| 2:40-2:50 | 자동 출근 처리 로직 | `lib/presentation/providers/attendance_provider.dart` | ⬜ |
| 2:50-3:00 | 출근 시간 로컬 저장 | `lib/core/storage/local_storage_service.dart` | ⬜ |

#### **Session 6: 실시간 시간 카운터** (40분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 3:00-3:10 | Timer 기반 카운터 위젯 생성 | `lib/presentation/widgets/attendance/time_counter_widget.dart` (신규) | ⬜ |
| 3:10-3:20 | 근무시간 카운터 구현 (1분 단위) | 위 파일 계속 | ⬜ |
| 3:20-3:30 | 휴게시간 카운터 구현 | 위 파일 계속 | ⬜ |
| 3:30-3:40 | 카운터 상태 관리 (Provider) | `lib/presentation/providers/time_counter_provider.dart` (신규) | ⬜ |

#### **Session 7: 휴게 관리 기능** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 3:40-3:50 | 휴게 시작/종료 UI 버튼 | `lib/presentation/widgets/attendance/break_control_widget.dart` (신규) | ⬜ |
| 3:50-4:00 | 휴게 상태 전환 로직 | `lib/presentation/providers/attendance_provider.dart` | ⬜ |
| 4:00-4:10 | 휴게 기록 로컬 저장 | `lib/data/datasources/attendance/attendance_local_datasource.dart` | ⬜ |

#### **Session 8: 퇴근 처리** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 4:10-4:20 | 퇴근 확인 다이얼로그 UI | `lib/presentation/widgets/attendance/checkout_dialog.dart` (신규) | ⬜ |
| 4:20-4:30 | 일일 근태 계산 로직 | `lib/domain/usecases/attendance/calculate_daily_attendance.dart` (신규) | ⬜ |
| 4:30-4:40 | 퇴근 처리 및 데이터 저장 | `lib/presentation/providers/attendance_provider.dart` | ⬜ |

#### **Session 9: 백엔드 동기화** (20분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 4:40-4:50 | 5분 주기 자동 동기화 설정 | `lib/core/services/sync_service.dart` (신규) | ⬜ |
| 4:50-5:00 | 오프라인 큐 관리 | `lib/domain/entities/attendance/attendance_queue.dart` 활용 | ⬜ |

---

## 📊 PHASE 3: 데이터 및 대시보드 (1-2시간)
### 목표: 근태 기록 저장, 대시보드 표시, 이력 조회

#### **Session 10: 데이터베이스 스키마** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 5:00-5:10 | Hive 모델 생성 (branches) | `lib/domain/entities/branch/branch.dart` (신규) | ⬜ |
| 5:10-5:20 | Hive 모델 생성 (attendance_records) | `lib/domain/entities/attendance/attendance_record.dart` (신규) | ⬜ |
| 5:20-5:30 | Hive 모델 생성 (break_records) | `lib/domain/entities/attendance/break_record.dart` (신규) | ⬜ |

#### **Session 11: 대시보드 UI 구성** (40분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 5:30-5:40 | 현재 상태 카드 위젯 | `lib/presentation/widgets/dashboard/current_status_card.dart` (신규) | ⬜ |
| 5:40-5:50 | 오늘의 근태 요약 위젯 | `lib/presentation/widgets/dashboard/today_summary_card.dart` (신규) | ⬜ |
| 5:50-6:00 | 실시간 카운터 통합 | `lib/presentation/pages/dashboard/user_dashboard_page.dart` | ⬜ |
| 6:00-6:10 | 액션 버튼 (휴게/퇴근) 배치 | 위 파일 계속 | ⬜ |

#### **Session 12: 이력 조회** (30분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 6:10-6:20 | 근태 이력 페이지 UI | `lib/presentation/pages/attendance/attendance_history_page.dart` (신규) | ⬜ |
| 6:20-6:30 | 일별/주별/월별 필터 구현 | 위 파일 계속 | ⬜ |
| 6:30-6:40 | 이력 데이터 조회 로직 | `lib/domain/usecases/attendance/get_attendance_history_usecase.dart` | ⬜ |

---

## 🧪 테스트 및 검증 (1시간)

#### **Session 13: 단위 테스트** (20분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 6:40-6:50 | 시간 카운터 테스트 | `test/unit/providers/time_counter_test.dart` | ⬜ |
| 6:50-7:00 | 근태 계산 로직 테스트 | `test/unit/usecases/attendance_test.dart` | ⬜ |

#### **Session 14: 통합 테스트** (20분)
| 시간 | 작업 | 파일 | 완료 |
|------|------|------|------|
| 7:00-7:10 | QR 스캔 → 등록 플로우 테스트 | `test/integration/registration_flow_test.dart` | ⬜ |
| 7:10-7:20 | 출근 → 휴게 → 퇴근 플로우 테스트 | `test/integration/attendance_flow_test.dart` | ⬜ |

#### **Session 15: 실기기 테스트** (20분)
| 시간 | 작업 | 체크리스트 | 완료 |
|------|------|------------|------|
| 7:20-7:30 | QR 생성 및 스캔 테스트 | 실제 QR 코드 생성/인식 확인 | ⬜ |
| 7:30-7:40 | 시간 카운터 정확도 검증 | 1분 단위 카운팅 확인 | ⬜ |

---

## 📝 추가 고려사항

### 병렬 작업 가능 항목
- UI 작업과 백엔드 로직은 별도 진행 가능
- 테스트 코드는 구현과 동시 작성 가능

### 의존성 관계
1. Phase 1 완료 후 Phase 2 시작
2. 시간 카운터는 출근 기능 완료 후 구현
3. 대시보드는 모든 기능 완료 후 통합

### 체크포인트
- Phase 1 완료: QR 스캔 → 등록 → 토큰 발급 확인
- Phase 2 완료: 출근 → 휴게 → 퇴근 전체 플로우 확인
- Phase 3 완료: 대시보드에서 모든 정보 정상 표시 확인

### 예상 이슈 및 대응
- **QR 인식 문제**: 다양한 조명 환경에서 테스트
- **시간 동기화**: 서버 시간과 로컬 시간 차이 처리
- **오프라인 모드**: 네트워크 없을 때 로컬 저장 후 동기화

---

## 🎯 즉시 시작 가능한 첫 번째 작업

```bash
# 1. 마스터 어드민 로그인 페이지 생성 (0:00-0:10)
flutter create lib/presentation/pages/auth/master_admin_login_page.dart

# 작업 내용:
# - 기본 Scaffold 구조
# - 로그인 폼 (username, password)
# - Neo-brutal 테마 적용
# - 로그인 버튼 및 이벤트 핸들러
```

이 워크플로우를 따라 순차적으로 작업하시면 5-8시간 내에 PLAN-1.md의 모든 기능을 구현할 수 있습니다.